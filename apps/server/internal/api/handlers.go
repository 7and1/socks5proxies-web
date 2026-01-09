package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"socksproxies.com/server/internal/config"
	"socksproxies.com/server/internal/rate"
	"socksproxies.com/server/internal/store"
)

type Handler struct {
	cfg                config.Config
	store              store.Storer
	proxyStore         store.ProxyListStore
	redis              *redis.Client
	limiter            *rate.Limiter
	apiLimiter         *rate.Limiter
	apiKeys            []string
	apiRateLimitWindow time.Duration
	apiLimit           int
}

func NewHandler(cfg config.Config, st store.Storer, redis *redis.Client) *Handler {
	counter := rate.NewRedisCounter(redis)
	if counter == nil {
		counter = rate.NewMemoryCounter()
	}
	limiter := rate.NewLimiter(counter, cfg.RateLimitPerDay)
	apiLimiter := rate.NewLimiterWithConfig(counter, rate.LimiterConfig{
		FreeLimit:      cfg.APIRateLimitHour,
		BasicLimit:     cfg.APIRateLimitHour * 10,
		ProLimit:       cfg.APIRateLimitHour * 100,
		WindowDuration: time.Hour,
	})
	var proxyStore store.ProxyListStore
	if ps, ok := st.(store.ProxyListStore); ok {
		proxyStore = ps
	}

	return &Handler{
		cfg:                cfg,
		store:              st,
		proxyStore:         proxyStore,
		redis:              redis,
		limiter:            limiter,
		apiLimiter:         apiLimiter,
		apiKeys:            cfg.APIKeys,
		apiRateLimitWindow: time.Hour,
		apiLimit:           cfg.APIRateLimitHour,
	}
}

func (h *Handler) GetLimiter() *rate.Limiter {
	return h.limiter
}

type HealthResponse struct {
	Status       string       `json:"status"`
	Service      string       `json:"service"`
	Timestamp    string       `json:"timestamp"`
	Database     HealthStatus `json:"database"`
	Redis        HealthStatus `json:"redis,omitempty"`
	ProxiesCount int          `json:"proxies_count"`
	Version      string       `json:"version,omitempty"`
}

type HealthStatus struct {
	Healthy bool   `json:"healthy"`
	Latency string `json:"latency,omitempty"`
	Message string `json:"message,omitempty"`
}

func (h *Handler) Health(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	// Performance: Single database call for both health check and count
	dbStatus, count := h.checkDatabaseWithCount(ctx)

	response := HealthResponse{
		Status:       "ok",
		Service:      "socks5proxies-api",
		Timestamp:    time.Now().UTC().Format(time.RFC3339),
		Database:     dbStatus,
		Redis:        h.checkRedis(ctx),
		ProxiesCount: count,
	}

	if !response.Database.Healthy {
		response.Status = "unhealthy"
		c.JSON(http.StatusServiceUnavailable, response)
		return
	}

	if count < 0 {
		response.Status = "degraded"
	}

	statusCode := http.StatusOK
	if response.Status == "degraded" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, response)
}

// checkDatabaseWithCount performs a single database call to check health and get count
func (h *Handler) checkDatabaseWithCount(ctx context.Context) (HealthStatus, int) {
	start := time.Now()
	count, err := h.store.CountProxies(ctx)
	latency := time.Since(start)

	if err != nil {
		// SECURITY: Do not expose internal error details
		return HealthStatus{
			Healthy: false,
			Message: "database unavailable",
		}, -1
	}
	return HealthStatus{
		Healthy: true,
		Latency: latency.String(),
	}, count
}

func (h *Handler) checkRedis(ctx context.Context) HealthStatus {
	if h.redis == nil {
		return HealthStatus{
			Healthy: false,
			Message: "not configured",
		}
	}

	start := time.Now()
	err := h.redis.Ping(ctx).Err()
	latency := time.Since(start)

	if err != nil {
		// SECURITY: Do not expose internal error details
		return HealthStatus{
			Healthy: false,
			Message: "cache unavailable",
		}
	}
	return HealthStatus{
		Healthy: true,
		Latency: latency.String(),
	}
}

func (h *Handler) Whoami(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"ip":      c.ClientIP(),
		"headers": c.Request.Header,
		"agent":   c.Request.UserAgent(),
	})
}

func (h *Handler) ListProxies(c *gin.Context) {
	if h.limiter != nil {
		allowed, count, err := h.limiter.Allow(c.Request.Context(), c.ClientIP())
		if err != nil {
			// SECURITY: Log error internally but don't expose details
			log.Printf("[ERROR] rate limiter error for %s: %v", c.ClientIP(), err)
			RespondError(c, http.StatusServiceUnavailable, "RATE_LIMITER_ERROR", "rate limiter unavailable", nil)
			return
		}
		if !allowed {
			RespondError(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "rate limit exceeded", map[string]any{
				"limit":         h.cfg.RateLimitPerDay,
				"requests_used": count,
			})
			return
		}
	}

	limit := parseLimit(c.Query("limit"), 100, 500)

	cacheKey := "cache:proxies:" + strconv.Itoa(limit)
	if h.redis != nil {
		if cached, err := h.redis.Get(c, cacheKey).Result(); err == nil && cached != "" {
			var cachedPayload any
			if json.Unmarshal([]byte(cached), &cachedPayload) == nil {
				c.JSON(http.StatusOK, cachedPayload)
				return
			}
		}
	}

	proxies, err := h.store.ListProxies(c.Request.Context(), limit)
	if err != nil {
		// SECURITY: Log error internally but don't expose details
		log.Printf("[ERROR] failed to list proxies: %v", err)
		RespondError(c, http.StatusInternalServerError, "DATABASE_ERROR", "failed to load proxies", nil)
		return
	}

	payload := gin.H{
		"items": proxies,
		"count": len(proxies),
	}

	if h.redis != nil {
		if raw, err := json.Marshal(payload); err == nil {
			_ = h.redis.Set(c, cacheKey, raw, 60*time.Second).Err()
		}
	}

	c.JSON(http.StatusOK, payload)
}

func parseLimit(raw string, fallback int, max int) int {
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed <= 0 {
		return fallback
	}
	if parsed > max {
		return max
	}
	return parsed
}
