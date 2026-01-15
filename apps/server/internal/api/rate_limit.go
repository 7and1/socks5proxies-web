package api

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"socksproxies.com/server/internal/config"
	"socksproxies.com/server/internal/rate"
)

type APILimiters struct {
	Light    *rate.Limiter
	Standard *rate.Limiter
	Heavy    *rate.Limiter
}

func NewAPILimiters(counter rate.Counter, cfg config.Config) APILimiters {
	if counter == nil {
		return APILimiters{}
	}

	window := cfg.APIRateLimitWindow
	return APILimiters{
		Light: rate.NewLimiterWithConfig(counter, rate.LimiterConfig{
			FreeLimit:      cfg.APIRateLimitLight,
			WindowDuration: window,
		}),
		Standard: rate.NewLimiterWithConfig(counter, rate.LimiterConfig{
			FreeLimit:      cfg.APIRateLimitStandard,
			WindowDuration: window,
		}),
		Heavy: rate.NewLimiterWithConfig(counter, rate.LimiterConfig{
			FreeLimit:      cfg.APIRateLimitHeavy,
			WindowDuration: window,
		}),
	}
}

func APIRateLimitMiddleware(cfg config.Config, limits APILimiters) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		if !strings.HasPrefix(path, "/api/") {
			c.Next()
			return
		}
		if path == "/api/health" {
			c.Next()
			return
		}

		limiter, limit, bucket := selectLimiter(path, cfg, limits)
		if limiter == nil || limit <= 0 {
			c.Next()
			return
		}

		ip := clientIP(c)
		subject := fmt.Sprintf("api:%s:%s", bucket, ip)
		allowed, count, err := limiter.Allow(c.Request.Context(), subject)
		if err != nil {
			log.Printf("[WARN] api rate limiter error for %s: %v", ip, err)
			RespondError(c, http.StatusServiceUnavailable, "RATE_LIMITER_ERROR", "rate limiter unavailable", nil)
			return
		}

		remaining := limit - int(count)
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", rateWindowReset(cfg.APIRateLimitWindow)))

		if !allowed {
			RespondError(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "rate limit exceeded", map[string]any{
				"limit":         limit,
				"requests_used": count,
			})
			return
		}

		c.Next()
	}
}

func selectLimiter(path string, cfg config.Config, limits APILimiters) (*rate.Limiter, int, string) {
	switch {
	case strings.HasPrefix(path, "/api/proxies/export"):
		return limits.Heavy, cfg.APIRateLimitHeavy, "heavy"
	case strings.HasPrefix(path, "/api/v1/proxies"):
		return limits.Heavy, cfg.APIRateLimitHeavy, "heavy"
	case strings.HasPrefix(path, "/api/proxies"):
		return limits.Standard, cfg.APIRateLimitStandard, "standard"
	case strings.HasPrefix(path, "/api/asn"):
		return limits.Standard, cfg.APIRateLimitStandard, "standard"
	case strings.HasPrefix(path, "/api/facets"):
		return limits.Light, cfg.APIRateLimitLight, "light"
	case strings.HasPrefix(path, "/api/whoami"):
		return limits.Light, cfg.APIRateLimitLight, "light"
	default:
		return limits.Light, cfg.APIRateLimitLight, "light"
	}
}

// RequireAPIKey creates middleware that requires valid API key authentication.
// Protected endpoints skip rate limiting since API keys represent trusted access.
func RequireAPIKey(apiKeys []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if len(apiKeys) == 0 {
			RespondError(c, http.StatusServiceUnavailable, "API_KEYS_NOT_CONFIGURED", "api keys not configured", nil)
			c.Abort()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing api key", nil)
			c.Abort()
			return
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "invalid authorization format", nil)
			c.Abort()
			return
		}

		token := strings.TrimSpace(authHeader[7:])
		if token == "" {
			RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing api key", nil)
			c.Abort()
			return
		}

		valid := false
		for _, key := range apiKeys {
			if key != "" && constantTimeCompare(token, key) {
				valid = true
				break
			}
		}

		if !valid {
			RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "invalid api key", nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// constantTimeCompare performs constant-time string comparison to prevent timing attacks.
func constantTimeCompare(x, y string) bool {
	if len(x) != len(y) {
		return false
	}
	result := byte(0)
	for i := 0; i < len(x); i++ {
		result |= x[i] ^ y[i]
	}
	return result == 0
}
