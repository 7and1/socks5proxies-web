package api

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"

	"socksproxies.com/server/internal/config"
)

func NewRouter(cfg config.Config) *gin.Engine {
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	router.Use(RecoveryMiddleware(log.New(os.Stdout, "[RECOVERY] ", log.LstdFlags)))
	router.Use(gin.Logger())
	router.Use(RequestIDMiddleware())
	router.Use(MetricsMiddleware())
	router.Use(SecurityHeadersMiddleware())
	router.Use(CORSMiddleware(cfg))
	router.Use(MaxBodySizeMiddleware(cfg.MaxBodySize))
	router.Use(WAFMiddleware(cfg))
	router.Use(SlowRequestMiddleware(cfg.SlowRequestThreshold))

	if err := router.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		log.Printf("trusted proxies config invalid: %v", err)
	}

	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "socks5proxies-api",
			"version": "1.0.0",
		})
	})

	router.GET("/metrics", MetricsHandler(cfg))

	return router
}

