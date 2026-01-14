package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port                    string
	RedisAddr               string
	RedisPassword           string
	RedisDB                 int
	DatabasePath            string
	DatabaseURL             string
	DatabaseSchema          string
	JudgeURL                string
	GeoIPPath               string
	GeoIPASNPath            string
	ProxyListPath           string
	ProxySourceURL          string
	ProxySyncInterval       time.Duration
	ProxyWebCacheTTL        time.Duration
	ProxyAPICacheTTL        time.Duration
	ProxyListWindowHours    int
	ProxyStatsWindowHours   int
	ProxyRetentionHours     int
	APIKeys                 []string
	APIRateLimitHour        int
	APIRateLimitWindow      time.Duration
	APIRateLimitLight       int
	APIRateLimitStandard    int
	APIRateLimitHeavy       int
	MaxConcurrent           int
	RateLimitPerDay         int
	RateLimitTiered         RateLimitTier
	AllowedOrigins          []string
	TrustedProxies          []string
	JWTSecret               string
	Environment             string
	MaxBodySize             int64
	LogLevel                string
	MaxWebSocketConnections int
	SentryDSN               string
	SentryTracesSampleRate  float64
	OTelEndpoint            string
	OTelServiceName         string
	OTelInsecure            bool
	SlowRequestThreshold    time.Duration
	WAFEnabled              bool
	ExportDir               string
	ExportJobTTL            time.Duration
	MetricsToken            string
	MetricsPublic           bool
	MetricsAllowedIPs       []string
	MetricsBasicUser        string
	MetricsBasicPass        string
}

type RateLimitTier struct {
	Free  int
	Basic int
	Pro   int
}

var (
	ErrInvalidPort      = fmt.Errorf("invalid port number")
	ErrInvalidRedisDB   = fmt.Errorf("invalid redis db number")
	ErrMissingJWTSecret = fmt.Errorf("JWT_SECRET required in production")
)

func Load() Config {
	cfg := Config{
		Port:                    getEnv("PORT", "8080"),
		RedisAddr:               getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:           getEnv("REDIS_PASSWORD", ""),
		RedisDB:                 getEnvInt("REDIS_DB", 0),
		DatabasePath:            getEnv("DB_PATH", "./data/socksproxies.db"),
		DatabaseURL:             getEnv("DATABASE_URL", ""),
		DatabaseSchema:          getEnv("DATABASE_SCHEMA", "socksproxies"),
		JudgeURL:                getEnv("JUDGE_URL", "https://api.ipify.org?format=text"),
		GeoIPPath:               getEnv("GEOIP_CITY_DB", getEnv("GEOIP_DB", "")),
		GeoIPASNPath:            getEnv("GEOIP_ASN_DB", ""),
		ProxyListPath:           getEnv("PROXY_LIST_PATH", ""),
		ProxySourceURL:          getEnv("PROXY_SOURCE_URL", ""),
		ProxySyncInterval:       getEnvDuration("PROXY_SYNC_INTERVAL", 5*time.Minute),
		ProxyAPICacheTTL:        getEnvDuration("PROXY_API_CACHE_TTL", 5*time.Minute),
		ProxyWebCacheTTL:        getEnvDuration("PROXY_WEB_CACHE_TTL", time.Hour),
		ProxyListWindowHours:    getEnvInt("PROXY_LIST_WINDOW_HOURS", 48),
		ProxyStatsWindowHours:   getEnvInt("PROXY_STATS_WINDOW_HOURS", 168),
		ProxyRetentionHours:     getEnvInt("PROXY_RETENTION_HOURS", 48),
		APIKeys:                 getEnvList("API_KEYS", ""),
		APIRateLimitHour:        getEnvInt("API_RATE_LIMIT_HOUR", 1000),
		APIRateLimitWindow:      getEnvDuration("API_RATE_LIMIT_WINDOW", time.Hour),
		APIRateLimitLight:       getEnvInt("API_RATE_LIMIT_LIGHT", 3000),
		APIRateLimitStandard:    getEnvInt("API_RATE_LIMIT_STANDARD", 1200),
		APIRateLimitHeavy:       getEnvInt("API_RATE_LIMIT_HEAVY", 300),
		MaxConcurrent:           getEnvInt("MAX_CONCURRENT", 50),
		RateLimitPerDay:         getEnvInt("RATE_LIMIT_PER_DAY", 100),
		AllowedOrigins:          getEnvList("ALLOWED_ORIGINS", "*"),
		TrustedProxies:          getEnvList("TRUSTED_PROXIES", "127.0.0.1,::1"),
		JWTSecret:               getEnv("JWT_SECRET", ""),
		Environment:             getEnv("ENVIRONMENT", "development"),
		MaxBodySize:             int64(getEnvInt("MAX_BODY_SIZE_KB", 100) * 1024),
		LogLevel:                getEnv("LOG_LEVEL", "info"),
		MaxWebSocketConnections: getEnvInt("MAX_WEBSOCKET_CONNECTIONS", 10),
		SentryDSN:               getEnv("SENTRY_DSN", ""),
		SentryTracesSampleRate:  getEnvFloat("SENTRY_TRACES_SAMPLE_RATE", 0),
		OTelEndpoint:            getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
		OTelServiceName:         getEnv("OTEL_SERVICE_NAME", "socks5proxies-api"),
		OTelInsecure:            getEnvBool("OTEL_EXPORTER_OTLP_INSECURE", true),
		SlowRequestThreshold:    getEnvDuration("SLOW_REQUEST_THRESHOLD", 2*time.Second),
		ExportDir:               getEnv("EXPORT_DIR", "./data/exports"),
		ExportJobTTL:            getEnvDuration("EXPORT_JOB_TTL", 2*time.Hour),
		MetricsToken:            getEnv("METRICS_TOKEN", ""),
		MetricsPublic:           getEnvBool("METRICS_PUBLIC", false),
		MetricsAllowedIPs:       getEnvList("METRICS_ALLOWED_IPS", ""),
		MetricsBasicUser:        getEnv("METRICS_BASIC_USER", ""),
		MetricsBasicPass:        getEnv("METRICS_BASIC_PASS", ""),
	}

	cfg.RateLimitTiered = RateLimitTier{
		Free:  getEnvInt("RATE_LIMIT_FREE", 100),
		Basic: getEnvInt("RATE_LIMIT_BASIC", 1000),
		Pro:   getEnvInt("RATE_LIMIT_PRO", 10000),
	}

	cfg.WAFEnabled = getEnvBool("WAF_ENABLED", cfg.Environment == "production")

	if err := cfg.Validate(); err != nil {
		log.Fatalf("config validation failed: %v", err)
	}

	return cfg
}

func (c *Config) Validate() error {
	if _, err := strconv.ParseInt(c.Port, 10, 64); err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidPort, c.Port)
	}

	if c.RedisDB < 0 || c.RedisDB > 15 {
		return fmt.Errorf("%w: %d", ErrInvalidRedisDB, c.RedisDB)
	}

	// SECURITY: Enforce stricter CORS in production
	if c.Environment == "production" {
		if len(c.AllowedOrigins) == 0 {
			return fmt.Errorf("ALLOWED_ORIGINS required in production")
		}
		for _, origin := range c.AllowedOrigins {
			if origin == "*" {
				return fmt.Errorf("ALLOWED_ORIGINS cannot include '*' in production")
			}
		}
	}

	if c.Environment == "production" && !c.MetricsPublic {
		if len(c.MetricsAllowedIPs) == 0 && c.MetricsToken == "" && (c.MetricsBasicUser == "" || c.MetricsBasicPass == "") {
			log.Printf("[SECURITY] metrics protected: configure METRICS_ALLOWED_IPS or METRICS_BASIC_USER/METRICS_BASIC_PASS to access /metrics")
		}
	}

	// SECURITY: Enforce JWT secret in production
	if c.Environment == "production" && c.JWTSecret == "" {
		return ErrMissingJWTSecret
	}

	// SECURITY: Validate JWT secret minimum length if provided
	if c.JWTSecret != "" && len(c.JWTSecret) < 32 {
		log.Printf("[SECURITY] WARNING: JWT_SECRET should be at least 32 characters for adequate security")
	}

	if c.MaxConcurrent < 1 {
		c.MaxConcurrent = 10
	}
	if c.MaxConcurrent > 500 {
		c.MaxConcurrent = 500
	}

	if c.MaxWebSocketConnections < 1 {
		c.MaxWebSocketConnections = 5
	}

	if c.APIRateLimitLight <= 0 {
		c.APIRateLimitLight = 3000
	}
	if c.APIRateLimitStandard <= 0 {
		c.APIRateLimitStandard = 1200
	}
	if c.APIRateLimitHeavy <= 0 {
		c.APIRateLimitHeavy = 300
	}
	if c.APIRateLimitWindow <= 0 {
		c.APIRateLimitWindow = time.Hour
	}
	if c.ProxyListWindowHours <= 0 {
		c.ProxyListWindowHours = 48
	}
	if c.ProxyStatsWindowHours <= 0 {
		c.ProxyStatsWindowHours = 168
	}
	minRetention := c.ProxyListWindowHours
	if c.ProxyStatsWindowHours > minRetention {
		minRetention = c.ProxyStatsWindowHours
	}
	if c.ProxyRetentionHours < minRetention {
		log.Printf("[CONFIG] PROXY_RETENTION_HOURS=%d too low; raising to %d to satisfy list/stats windows", c.ProxyRetentionHours, minRetention)
		c.ProxyRetentionHours = minRetention
	}

	if c.SentryTracesSampleRate < 0 {
		c.SentryTracesSampleRate = 0
	}
	if c.SentryTracesSampleRate > 1 {
		c.SentryTracesSampleRate = 1
	}

	if c.SlowRequestThreshold < 0 {
		c.SlowRequestThreshold = 0
	}

	if c.ExportDir == "" {
		c.ExportDir = "./data/exports"
	}
	if c.ExportJobTTL <= 0 {
		c.ExportJobTTL = 2 * time.Hour
	}

	return nil
}

func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

func (c *Config) GetRateLimitForTier(tier string) int {
	switch strings.ToLower(tier) {
	case "pro":
		return c.RateLimitTiered.Pro
	case "basic":
		return c.RateLimitTiered.Basic
	default:
		return c.RateLimitTiered.Free
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	val := getEnv(key, "")
	if val == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(val)
	if err != nil {
		return fallback
	}
	return parsed
}

func getEnvFloat(key string, fallback float64) float64 {
	val := strings.TrimSpace(getEnv(key, ""))
	if val == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(val, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	val := strings.TrimSpace(getEnv(key, ""))
	if val == "" {
		return fallback
	}
	if parsed, err := time.ParseDuration(val); err == nil {
		return parsed
	}
	if seconds, err := strconv.Atoi(val); err == nil {
		return time.Duration(seconds) * time.Second
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	val := strings.TrimSpace(strings.ToLower(getEnv(key, "")))
	if val == "" {
		return fallback
	}
	switch val {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		return fallback
	}
}

func getEnvList(key, fallback string) []string {
	val := getEnv(key, fallback)
	parts := strings.Split(val, ",")
	clean := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.TrimSpace(part)
		if item != "" {
			clean = append(clean, item)
		}
	}
	return clean
}
