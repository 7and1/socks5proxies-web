package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"

	"socksproxies.com/server/internal/api"
	"socksproxies.com/server/internal/config"
	"socksproxies.com/server/internal/geoip"
	"socksproxies.com/server/internal/proxylist"
	"socksproxies.com/server/internal/rate"
	"socksproxies.com/server/internal/store"
	"socksproxies.com/server/internal/ws"
)

func main() {
	// Performance: Set GOMAXPROCS based on available CPUs
	runtime.GOMAXPROCS(runtime.NumCPU())

	cfg := config.Load()

	obs := InitObservability(cfg)
	if obs.PanicNotifier != nil {
		api.SetPanicNotifier(obs.PanicNotifier)
	}

	storage, err := store.OpenStore(cfg.DatabaseURL, cfg.DatabaseSchema, cfg.DatabasePath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer storage.Close()
	log.Printf("database backend: %s", storage.Backend())

	geo, err := geoip.Load(cfg.GeoIPPath, cfg.GeoIPASNPath)
	if err != nil {
		log.Printf("geoip disabled: %v", err)
	} else {
		defer geo.Close()
	}

	// Performance: Optimized Redis connection pool
	redisClient := redis.NewClient(&redis.Options{
		Addr:         cfg.RedisAddr,
		Password:     cfg.RedisPassword,
		DB:           cfg.RedisDB,
		PoolSize:     runtime.NumCPU() * 10,
		MinIdleConns: runtime.NumCPU() * 2,
		MaxRetries:   3,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		PoolTimeout:  4 * time.Second,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Printf("redis unavailable: %v", err)
		redisClient = nil
	} else {
		defer redisClient.Close()
	}
	cancel()

	router := api.NewRouter(cfg)
	if obs.SentryMiddleware != nil {
		router.Use(obs.SentryMiddleware)
	}
	if obs.OTelMiddleware != nil {
		router.Use(obs.OTelMiddleware)
	}

	counter := rate.NewRedisCounter(redisClient)
	if counter == nil {
		counter = rate.NewMemoryCounter()
	}
	apiLimiters := api.NewAPILimiters(counter, cfg)
	router.Use(api.APIRateLimitMiddleware(cfg, apiLimiters))

	apiHandler := api.NewHandler(cfg, storage, redisClient)

	router.GET("/api/health", apiHandler.Health)
	router.GET("/api/whoami", apiHandler.Whoami)
	router.POST("/api/cache/warm", api.RequireAPIKey(cfg.APIKeys), apiHandler.WarmCacheEndpoint)
	router.GET("/api/proxies", apiHandler.ListProxyListPublic)
	router.GET("/api/proxies/stats", apiHandler.GetProxyStats)
	router.GET("/api/proxies/recent", apiHandler.ListRecentProxies)
	router.GET("/api/proxies/random", apiHandler.ListRandomProxies)
	router.GET("/api/proxies/export/:format", apiHandler.ExportProxyList)
	router.POST("/api/proxies/export/jobs", apiHandler.CreateExportJob)
	router.GET("/api/proxies/export/jobs/:id", apiHandler.GetExportJob)
	router.GET("/api/proxies/export/jobs/:id/download", apiHandler.DownloadExportJob)
	router.GET("/api/v1/proxies", apiHandler.ListProxyListAuth)
	router.GET("/api/facets/countries", apiHandler.ListProxyFacetsCountries)
	router.GET("/api/facets/ports", apiHandler.ListProxyFacetsPorts)
	router.GET("/api/facets/protocols", apiHandler.ListProxyFacetsProtocols)
	router.GET("/api/facets/cities", apiHandler.ListProxyFacetsCities)
	router.GET("/api/facets/regions", apiHandler.ListProxyFacetsRegions)
	router.GET("/api/facets/asns", apiHandler.ListProxyFacetsASNs)
	router.GET("/api/asn/:asn", apiHandler.GetASNDetails)

	wsHandler := ws.NewHandler(cfg, storage, geo, apiHandler.GetLimiter(), ws.WithAlert(obs.Alert))
	router.GET("/ws", wsHandler.Handle)

	if cfg.ProxyListPath != "" {
		go func() {
			count, err := proxylist.SeedFromFile(context.Background(), storage, cfg.ProxyListPath, "socks5")
			if err != nil {
				log.Printf("proxy seed failed: %v", err)
				return
			}
			log.Printf("seeded %d proxies", count)
		}()
	}

	syncCtx, cancelSync := context.WithCancel(context.Background())
	defer cancelSync()

	if cfg.ProxySourceURL != "" {
		syncer := proxylist.NewSyncer(proxylist.SyncConfig{
			SourceURL:      cfg.ProxySourceURL,
			SyncInterval:   cfg.ProxySyncInterval,
			WebCacheTTL:    cfg.ProxyWebCacheTTL,
			APICacheTTL:    cfg.ProxyAPICacheTTL,
			Retention:      time.Duration(cfg.ProxyRetentionHours) * time.Hour,
			RequestTimeout: 30 * time.Second,
			AfterSync:      apiHandler.WarmProxyCaches,
		}, storage, redisClient, geo)
		go syncer.Start(syncCtx)
	}

	// Performance: Optimized HTTP server timeouts
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1MB
	}

	go func() {
		log.Printf("api listening on :%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server stopped: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}

	if obs.Shutdown != nil {
		if err := obs.Shutdown(shutdownCtx); err != nil {
			log.Printf("observability shutdown failed: %v", err)
		}
	}
	if obs.Flush != nil {
		obs.Flush()
	}
}
