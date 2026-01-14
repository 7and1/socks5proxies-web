package api

import (
	"crypto/subtle"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"socksproxies.com/server/internal/config"
)

var (
	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests processed.",
		},
		[]string{"method", "path", "status"},
	)
	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency distributions.",
			Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5},
		},
		[]string{"method", "path"},
	)
	httpInFlight = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "http_in_flight_requests",
			Help: "Current number of in-flight HTTP requests.",
		},
	)
	proxylistCacheHits = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "proxylist_cache_hits_total",
			Help: "Total number of proxy list cache hits.",
		},
		[]string{"category", "scope"},
	)
	proxylistCacheMisses = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "proxylist_cache_misses_total",
			Help: "Total number of proxy list cache misses.",
		},
		[]string{"category", "scope"},
	)
)

func init() {
	prometheus.MustRegister(httpRequestsTotal, httpRequestDuration, httpInFlight, proxylistCacheHits, proxylistCacheMisses)
}

func MetricsHandler(cfg config.Config) gin.HandlerFunc {
	handler := promhttp.Handler()
	return func(c *gin.Context) {
		if cfg.IsProduction() && !cfg.MetricsPublic {
			if !metricsProtectionConfigured(cfg) {
				c.AbortWithStatus(http.StatusNotFound)
				return
			}

			if isMetricsIPAllowed(c.ClientIP(), cfg.MetricsAllowedIPs) {
				handler.ServeHTTP(c.Writer, c.Request)
				return
			}

			if isMetricsBasicAuthorized(c, cfg.MetricsBasicUser, cfg.MetricsBasicPass) {
				handler.ServeHTTP(c.Writer, c.Request)
				return
			}

			if cfg.MetricsToken != "" && isMetricsTokenAuthorized(c, cfg.MetricsToken) {
				handler.ServeHTTP(c.Writer, c.Request)
				return
			}

			if cfg.MetricsBasicUser != "" && cfg.MetricsBasicPass != "" {
				c.Header("WWW-Authenticate", "Basic")
				c.AbortWithStatus(http.StatusUnauthorized)
				return
			}

			c.AbortWithStatus(http.StatusForbidden)
			return
		}
		handler.ServeHTTP(c.Writer, c.Request)
	}
}

func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}
		if path == "/metrics" {
			c.Next()
			return
		}

		httpInFlight.Inc()
		start := time.Now()
		c.Next()
		duration := time.Since(start).Seconds()
		httpInFlight.Dec()

		status := strconv.Itoa(c.Writer.Status())
		httpRequestsTotal.WithLabelValues(c.Request.Method, path, status).Inc()
		httpRequestDuration.WithLabelValues(c.Request.Method, path).Observe(duration)
	}
}

func metricsProtectionConfigured(cfg config.Config) bool {
	if cfg.MetricsPublic {
		return true
	}
	if len(cfg.MetricsAllowedIPs) > 0 {
		return true
	}
	if cfg.MetricsBasicUser != "" && cfg.MetricsBasicPass != "" {
		return true
	}
	if cfg.MetricsToken != "" {
		return true
	}
	return false
}

func isMetricsTokenAuthorized(c *gin.Context, token string) bool {
	auth := strings.TrimSpace(c.GetHeader("Authorization"))
	if auth == "" {
		return false
	}
	if strings.HasPrefix(auth, "Bearer ") {
		auth = strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
	}
	if auth == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(auth), []byte(token)) == 1
}

func isMetricsBasicAuthorized(c *gin.Context, username, password string) bool {
	if username == "" || password == "" {
		return false
	}
	user, pass, ok := c.Request.BasicAuth()
	if !ok {
		return false
	}
	if subtle.ConstantTimeCompare([]byte(user), []byte(username)) != 1 {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(pass), []byte(password)) == 1
}

func isMetricsIPAllowed(ip string, allowed []string) bool {
	if ip == "" || len(allowed) == 0 {
		return false
	}
	parsed := net.ParseIP(strings.TrimSpace(ip))
	if parsed == nil {
		return false
	}
	for _, entry := range allowed {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		if strings.Contains(entry, "/") {
			if _, network, err := net.ParseCIDR(entry); err == nil && network.Contains(parsed) {
				return true
			}
			continue
		}
		if parsed.Equal(net.ParseIP(entry)) {
			return true
		}
	}
	return false
}
