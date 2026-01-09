package api

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"socksproxies.com/server/internal/config"
)

type CORSConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	ExposedHeaders   []string
	AllowCredentials bool
	MaxAge           int
	Debug            bool
}

func NewCORSConfig(cfg config.Config) CORSConfig {
	allowedOrigins := cfg.AllowedOrigins
	
	hasWildcard := false
	for _, origin := range allowedOrigins {
		if origin == "*" {
			hasWildcard = true
			break
		}
	}

	if hasWildcard && len(allowedOrigins) == 1 {
		log.Printf("[WARN] CORS: Wildcard (*) origin is enabled. This is not recommended for production.")
	}

	return CORSConfig{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "OPTIONS", "HEAD"},
		AllowedHeaders:   []string{"Content-Type", "Authorization", "X-Request-ID"},
		ExposedHeaders:   []string{"X-Request-ID", "Content-Length", "Content-Type"},
		AllowCredentials: !hasWildcard,
		MaxAge:           86400,
		Debug:            cfg.IsDevelopment(),
	}
}

func (c CORSConfig) isOriginAllowed(origin string) bool {
	if origin == "" {
		return true
	}

	for _, allowed := range c.AllowedOrigins {
		if allowed == "*" {
			return true
		}
		if strings.EqualFold(allowed, origin) {
			return true
		}
		if strings.HasPrefix(allowed, "*.") {
			// Extract base domain from wildcard pattern (e.g., "*.socks5proxies.com" -> "socks5proxies.com")
			baseDomain := strings.TrimPrefix(allowed, "*.")

			// Extract host from origin (remove protocol)
			originHost := strings.TrimPrefix(origin, "https://")
			originHost = strings.TrimPrefix(originHost, "http://")

			// Remove port if present
			if idx := strings.Index(originHost, ":"); idx != -1 {
				originHost = originHost[:idx]
			}

			// SECURITY: Check for exact base domain match (e.g., "socks5proxies.com")
			if strings.EqualFold(originHost, baseDomain) {
				return true
			}

			// SECURITY: Check for proper subdomain match
			// Must end with ".<baseDomain>" to prevent "evilsocks5proxies.com" matching "*.socks5proxies.com"
			suffix := "." + baseDomain
			if strings.HasSuffix(strings.ToLower(originHost), strings.ToLower(suffix)) {
				// Ensure there's actually a subdomain part before the suffix
				subdomain := strings.TrimSuffix(strings.ToLower(originHost), strings.ToLower(suffix))
				if len(subdomain) > 0 && !strings.Contains(subdomain, ".") {
					return true
				}
				// Allow multi-level subdomains (e.g., "api.v2.socks5proxies.com")
				if len(subdomain) > 0 {
					return true
				}
			}
		}
	}

	return false
}

func CORSMiddleware(cfg config.Config) gin.HandlerFunc {
	corsConfig := NewCORSConfig(cfg)

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		method := c.Request.Method

		allowed := corsConfig.isOriginAllowed(origin)

		// SECURITY: For non-OPTIONS requests from disallowed origins, log and continue
		// (browser will block response anyway due to missing CORS headers)
		if origin != "" && !allowed {
			log.Printf("[CORS] Blocked origin: %s for %s %s", origin, method, c.Request.URL.Path)
			// For API endpoints in production, reject with 403 for non-allowed origins
			if cfg.IsProduction() && strings.HasPrefix(c.Request.URL.Path, "/api/") {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"code":    "CORS_BLOCKED",
					"message": "Origin not allowed",
				})
				return
			}
		}

		if allowed && origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
			// SECURITY: Prevent cache poisoning when using dynamic origins
			c.Header("Vary", "Origin")
		}

		if corsConfig.AllowCredentials {
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		if len(corsConfig.ExposedHeaders) > 0 {
			c.Header("Access-Control-Expose-Headers", strings.Join(corsConfig.ExposedHeaders, ", "))
		}

		if method == http.MethodOptions {
			c.Header("Access-Control-Allow-Methods", strings.Join(corsConfig.AllowedMethods, ", "))
			c.Header("Access-Control-Allow-Headers", strings.Join(corsConfig.AllowedHeaders, ", "))
			c.Header("Access-Control-Max-Age", fmt.Sprintf("%d", corsConfig.MaxAge))

			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
