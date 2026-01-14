package api

import (
	"bytes"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"

	"socksproxies.com/server/internal/rate"
	"socksproxies.com/server/internal/store"
)

type ProxyListItem struct {
	Host           string   `json:"host"`
	IP             string   `json:"ip"`
	Port           int      `json:"port"`
	Delay          int      `json:"delay"`
	CountryCode    string   `json:"country_code"`
	CountryName    string   `json:"country_name"`
	City           string   `json:"city,omitempty"`
	Region         string   `json:"region,omitempty"`
	ASN            int      `json:"asn,omitempty"`
	ASNName        string   `json:"asn_name,omitempty"`
	Org            string   `json:"org,omitempty"`
	ContinentCode  string   `json:"continent_code,omitempty"`
	ChecksUp       int      `json:"checks_up"`
	ChecksDown     int      `json:"checks_down"`
	Anon           int      `json:"anon"`
	HTTP           int      `json:"http"`
	SSL            int      `json:"ssl"`
	Socks4         int      `json:"socks4"`
	Socks5         int      `json:"socks5"`
	Protocols      []string `json:"protocols"`
	AnonymityLevel string   `json:"anonymity_level"`
	Uptime         int      `json:"uptime"`
	LastSeen       string   `json:"last_seen"`
}

type ProxyListMeta struct {
	Total    int    `json:"total"`
	Limit    int    `json:"limit"`
	Offset   int    `json:"offset"`
	Cached   bool   `json:"cached"`
	CacheAge int    `json:"cache_age"`
	LastSync string `json:"last_sync,omitempty"`
}

func (h *Handler) ListProxyListPublic(c *gin.Context) {
	h.handleProxyList(c, false)
}

func (h *Handler) ListProxyListAuth(c *gin.Context) {
	apiKey, ok := h.requireAPIKey(c)
	if !ok {
		return
	}

	if h.apiLimiter != nil {
		allowed, count, err := h.apiLimiter.AllowTier(c.Request.Context(), "apikey:"+apiKey, rate.TierFree)
		if err != nil {
			RespondError(c, http.StatusServiceUnavailable, "RATE_LIMITER_ERROR", "rate limiter unavailable", nil)
			return
		}
		limit := h.apiLimit
		remaining := limit - int(count)
		reset := rateWindowReset(h.apiRateLimitWindow)
		c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(reset, 10))

		if !allowed {
			RespondError(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "rate limit exceeded", map[string]any{
				"limit":         limit,
				"requests_used": count,
			})
			return
		}
	}

	h.handleProxyList(c, true)
}

func (h *Handler) GetProxyStats(c *gin.Context) {
	if h.proxyStore == nil {
		RespondError(c, http.StatusServiceUnavailable, "PROXYLIST_UNAVAILABLE", "proxy list not configured", nil)
		return
	}

	cacheKey := buildProxyStatsCacheKey(loadProxyCacheVersion(c, h.redis))
	cacheTTL := time.Minute
	setCacheHeaders(c, cacheTTL, true)
	cacheAttempted := h.redis != nil && cacheTTL > 0
	if cacheAttempted {
		if cachedPayload, ok := h.getCachedPayload(c, cacheKey); ok {
			proxylistCacheHits.WithLabelValues("stats", "web").Inc()
			if shouldLogCache(h.cfg.LogLevel) {
				log.Printf("[cache] proxylist stats hit key=%s", cacheKey)
			}
			if meta, ok := cachedPayload["meta"].(map[string]any); ok {
				meta["cached"] = true
				meta["cache_age"] = h.getCacheAgeSeconds(c)
				if lastSync := h.getLastSyncTimestamp(c); !lastSync.IsZero() {
					meta["last_sync"] = lastSync.UTC().Format(time.RFC3339)
				}
			}
			c.JSON(http.StatusOK, cachedPayload)
			return
		}
		proxylistCacheMisses.WithLabelValues("stats", "web").Inc()
		if shouldLogCache(h.cfg.LogLevel) {
			log.Printf("[cache] proxylist stats miss key=%s", cacheKey)
		}
	}

	stats, err := h.proxyStore.GetProxyStats(c.Request.Context())
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "DATABASE_ERROR", "failed to load proxy stats", nil)
		return
	}

	meta := gin.H{
		"cached":    false,
		"cache_age": h.getCacheAgeSeconds(c),
	}
	if lastSync := h.getLastSyncTimestamp(c); !lastSync.IsZero() {
		meta["last_sync"] = lastSync.UTC().Format(time.RFC3339)
	}

	payload := gin.H{
		"data": stats,
		"meta": meta,
	}

	if h.redis != nil && cacheTTL > 0 {
		if raw, err := json.Marshal(payload); err == nil {
			_ = h.redis.Set(c, cacheKey, raw, cacheTTL).Err()
		}
	}

	c.JSON(http.StatusOK, payload)
}

func (h *Handler) ListRecentProxies(c *gin.Context) {
	if h.proxyStore == nil {
		RespondError(c, http.StatusServiceUnavailable, "PROXYLIST_UNAVAILABLE", "proxy list not configured", nil)
		return
	}

	limit := parseLimit(c.Query("limit"), 10, 50)
	cacheKey := buildProxyRecentCacheKey(limit, loadProxyCacheVersion(c, h.redis))
	cacheTTL := 30 * time.Second
	setCacheHeaders(c, cacheTTL, true)
	cacheAttempted := h.redis != nil && cacheTTL > 0
	if cacheAttempted {
		if cachedPayload, ok := h.getCachedPayload(c, cacheKey); ok {
			proxylistCacheHits.WithLabelValues("recent", "web").Inc()
			if shouldLogCache(h.cfg.LogLevel) {
				log.Printf("[cache] proxylist recent hit key=%s", cacheKey)
			}
			if meta, ok := cachedPayload["meta"].(map[string]any); ok {
				meta["cached"] = true
				meta["cache_age"] = h.getCacheAgeSeconds(c)
				if lastSync := h.getLastSyncTimestamp(c); !lastSync.IsZero() {
					meta["last_sync"] = lastSync.UTC().Format(time.RFC3339)
				}
			}
			c.JSON(http.StatusOK, cachedPayload)
			return
		}
		proxylistCacheMisses.WithLabelValues("recent", "web").Inc()
		if shouldLogCache(h.cfg.LogLevel) {
			log.Printf("[cache] proxylist recent miss key=%s", cacheKey)
		}
	}

	records, err := h.proxyStore.ListRecentProxies(c.Request.Context(), limit)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "DATABASE_ERROR", "failed to load recent proxies", nil)
		return
	}

	data := make([]ProxyListItem, 0, len(records))
	for _, record := range records {
		data = append(data, transformProxyRecord(record))
	}

	payload := gin.H{
		"data": data,
		"meta": gin.H{
			"limit":     limit,
			"cached":    false,
			"cache_age": h.getCacheAgeSeconds(c),
		},
	}
	if lastSync := h.getLastSyncTimestamp(c); !lastSync.IsZero() {
		if meta, ok := payload["meta"].(gin.H); ok {
			meta["last_sync"] = lastSync.UTC().Format(time.RFC3339)
		}
	}

	if h.redis != nil && cacheTTL > 0 {
		if raw, err := json.Marshal(payload); err == nil {
			_ = h.redis.Set(c, cacheKey, raw, cacheTTL).Err()
		}
	}

	c.JSON(http.StatusOK, payload)
}

func (h *Handler) ListRandomProxies(c *gin.Context) {
	if h.proxyStore == nil {
		RespondError(c, http.StatusServiceUnavailable, "PROXYLIST_UNAVAILABLE", "proxy list not configured", nil)
		return
	}

	limit := parseLimit(c.Query("limit"), 10, 50)
	setCacheHeaders(c, 0, true)
	records, err := h.proxyStore.ListRandomProxies(c.Request.Context(), limit)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "DATABASE_ERROR", "failed to load random proxies", nil)
		return
	}

	data := make([]ProxyListItem, 0, len(records))
	for _, record := range records {
		data = append(data, transformProxyRecord(record))
	}

	payload := gin.H{
		"data": data,
		"meta": gin.H{
			"limit":     limit,
			"cache_age": h.getCacheAgeSeconds(c),
			"cached":    false,
		},
	}
	if lastSync := h.getLastSyncTimestamp(c); !lastSync.IsZero() {
		if meta, ok := payload["meta"].(gin.H); ok {
			meta["last_sync"] = lastSync.UTC().Format(time.RFC3339)
		}
	}

	c.JSON(http.StatusOK, payload)
}

func (h *Handler) ExportProxyList(c *gin.Context) {
	if h.proxyStore == nil {
		RespondError(c, http.StatusServiceUnavailable, "PROXYLIST_UNAVAILABLE", "proxy list not configured", nil)
		return
	}

	format := strings.ToLower(strings.TrimPrefix(c.Param("format"), "."))
	if !isExportFormatSupported(format) {
		RespondError(c, http.StatusBadRequest, "INVALID_EXPORT_FORMAT", "unsupported export format", nil)
		return
	}

	opts := parseExportOptions(c, format)
	if opts.Async {
		if h.exportManager == nil {
			RespondError(c, http.StatusServiceUnavailable, "EXPORT_UNAVAILABLE", "export jobs unavailable", nil)
			return
		}
		job, err := h.exportManager.CreateJob(
			c.Request.Context(),
			opts.Format,
			opts.Filters,
			opts.TotalLimit,
			opts.Offset,
			opts.PageSize,
		)
		if err != nil {
			RespondError(c, http.StatusBadRequest, "EXPORT_JOB_ERROR", err.Error(), nil)
			return
		}
		respondExportJobAccepted(c, job)
		return
	}

	if opts.Stream || opts.TotalLimit > opts.PageSize {
		streamExportResponse(c, h.proxyStore, opts)
		return
	}

	opts.Filters.Limit = opts.TotalLimit
	opts.Filters.Offset = opts.Offset

	records, _, err := h.proxyStore.ListProxyList(c.Request.Context(), opts.Filters)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "DATABASE_ERROR", "failed to export proxies", nil)
		return
	}

	data := make([]ProxyListItem, 0, len(records))
	for _, record := range records {
		data = append(data, transformProxyRecord(record))
	}

	filename := fmt.Sprintf("proxy-export-%s-%s.%s", opts.Filters.Protocol, time.Now().UTC().Format("2006-01-02"), format)
	if opts.Filters.Protocol == "" {
		filename = fmt.Sprintf("proxy-export-%s.%s", time.Now().UTC().Format("2006-01-02"), format)
	}

	switch format {
	case "txt", "text", "list":
		payload := buildPlainProxyList(data)
		setExportHeaders(c, format, filename)
		c.String(http.StatusOK, payload)
	case "csv":
		payload, err := buildProxyCSV(data)
		if err != nil {
			RespondError(c, http.StatusInternalServerError, "EXPORT_ERROR", "failed to build csv export", nil)
			return
		}
		setExportHeaders(c, format, filename)
		c.Data(http.StatusOK, "text/csv; charset=utf-8", payload)
	case "json":
		setExportHeaders(c, format, filename)
		c.JSON(http.StatusOK, gin.H{"data": data})
	case "clash":
		payload := buildClashConfig(data)
		setExportHeaders(c, format, filename)
		c.String(http.StatusOK, payload)
	case "surfshark":
		payload := buildSurfsharkList(data)
		setExportHeaders(c, format, filename)
		c.String(http.StatusOK, payload)
	default:
		RespondError(c, http.StatusBadRequest, "INVALID_EXPORT_FORMAT", "unsupported export format", nil)
	}
}

func (h *Handler) handleProxyList(c *gin.Context, authenticated bool) {
	if h.proxyStore == nil {
		RespondError(c, http.StatusServiceUnavailable, "PROXYLIST_UNAVAILABLE", "proxy list not configured", nil)
		return
	}
	filters := buildProxyListFilters(c, 25, 100)
	if h.cfg.ProxyListWindowHours > 0 {
		filters.Since = time.Now().UTC().Add(-time.Duration(h.cfg.ProxyListWindowHours) * time.Hour)
	}

	cacheKey := ""
	cacheTTL := h.cfg.ProxyWebCacheTTL
	if authenticated {
		cacheTTL = h.cfg.ProxyAPICacheTTL
	}
	setCacheHeaders(c, cacheTTL, !authenticated)
	if authenticated {
		c.Header("Vary", "Authorization")
	}
	cacheScope := "web"
	if authenticated {
		cacheScope = "api"
	}
	cacheAttempted := h.redis != nil && cacheTTL > 0
	if cacheAttempted {
		cacheKey = buildProxyCacheKey(filters, authenticated, loadProxyCacheVersion(c, h.redis))
		if cachedRaw, err := h.redis.Get(c, cacheKey).Result(); err == nil && cachedRaw != "" {
			var cachedResponse struct {
				Data []ProxyListItem `json:"data"`
				Meta ProxyListMeta   `json:"meta"`
			}
			if err := json.Unmarshal([]byte(cachedRaw), &cachedResponse); err == nil {
				proxylistCacheHits.WithLabelValues("list", cacheScope).Inc()
				if shouldLogCache(h.cfg.LogLevel) {
					log.Printf("[cache] proxylist list hit scope=%s key=%s", cacheScope, cacheKey)
				}
				cacheAge := h.getCacheAgeSeconds(c)
				cachedResponse.Meta.Cached = true
				cachedResponse.Meta.CacheAge = cacheAge
				if lastSync := h.getLastSyncTimestamp(c); !lastSync.IsZero() {
					cachedResponse.Meta.LastSync = lastSync.UTC().Format(time.RFC3339)
				}

				if etag := buildProxyListETag(cachedResponse.Data, cachedResponse.Meta); etag != "" {
					if writeETagAndCheck(c, etag) {
						return
					}
				}

				c.JSON(http.StatusOK, cachedResponse)
				return
			}
		}
		proxylistCacheMisses.WithLabelValues("list", cacheScope).Inc()
		if shouldLogCache(h.cfg.LogLevel) {
			log.Printf("[cache] proxylist list miss scope=%s key=%s", cacheScope, cacheKey)
		}
	}

	if !authenticated && h.limiter != nil {
		allowed, count, err := h.limiter.Allow(c.Request.Context(), c.ClientIP())
		if err != nil {
			RespondError(c, http.StatusServiceUnavailable, "RATE_LIMITER_ERROR", "rate limiter unavailable", nil)
			return
		}

		// Performance: Add rate limit headers for all requests
		limit := h.cfg.RateLimitPerDay
		remaining := limit - int(count)
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(rateWindowReset(24*time.Hour), 10))

		if !allowed {
			RespondError(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "rate limit exceeded", map[string]any{
				"limit":         limit,
				"requests_used": count,
			})
			return
		}
	}

	records, total, err := h.proxyStore.ListProxyList(c.Request.Context(), filters)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "DATABASE_ERROR", "failed to load proxies", nil)
		return
	}

	data := make([]ProxyListItem, 0, len(records))
	for _, record := range records {
		data = append(data, transformProxyRecord(record))
	}

	cacheAge := h.getCacheAgeSeconds(c)
	meta := ProxyListMeta{
		Total:    total,
		Limit:    filters.Limit,
		Offset:   filters.Offset,
		Cached:   false,
		CacheAge: cacheAge,
	}
	if lastSync := h.getLastSyncTimestamp(c); !lastSync.IsZero() {
		meta.LastSync = lastSync.UTC().Format(time.RFC3339)
	}

	payload := gin.H{
		"data": data,
		"meta": meta,
	}

	if h.redis != nil && cacheTTL > 0 && cacheKey != "" {
		if raw, err := json.Marshal(payload); err == nil {
			_ = h.redis.Set(c, cacheKey, raw, cacheTTL).Err()
		}
	}

	if etag := buildProxyListETag(data, meta); etag != "" {
		if writeETagAndCheck(c, etag) {
			return
		}
	}

	c.JSON(http.StatusOK, payload)
}

func (h *Handler) ListProxyFacetsCountries(c *gin.Context) {
	h.listProxyFacets(c, "country")
}

func (h *Handler) ListProxyFacetsPorts(c *gin.Context) {
	h.listProxyFacets(c, "port")
}

func (h *Handler) ListProxyFacetsProtocols(c *gin.Context) {
	h.listProxyFacets(c, "protocol")
}

func (h *Handler) ListProxyFacetsCities(c *gin.Context) {
	h.listProxyFacets(c, "city")
}

func (h *Handler) ListProxyFacetsRegions(c *gin.Context) {
	h.listProxyFacets(c, "region")
}

func (h *Handler) ListProxyFacetsASNs(c *gin.Context) {
	h.listProxyFacets(c, "asn")
}

func (h *Handler) GetASNDetails(c *gin.Context) {
	if h.proxyStore == nil {
		RespondError(c, http.StatusServiceUnavailable, "PROXYLIST_UNAVAILABLE", "proxy list not configured", nil)
		return
	}

	asnParam := strings.TrimSpace(c.Param("asn"))
	asn, err := strconv.Atoi(asnParam)
	if err != nil || asn <= 0 {
		RespondError(c, http.StatusBadRequest, "INVALID_ASN", "asn must be a positive integer", nil)
		return
	}

	details, err := h.proxyStore.GetASNDetails(c.Request.Context(), asn)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "DATABASE_ERROR", "failed to load asn details", nil)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": details,
	})
}

func (h *Handler) listProxyFacets(c *gin.Context, facetType string) {
	if h.proxyStore == nil {
		RespondError(c, http.StatusServiceUnavailable, "PROXYLIST_UNAVAILABLE", "proxy list not configured", nil)
		return
	}

	limit := parseLimit(c.Query("limit"), 200, 5000)
	offset := parseOffset(c.Query("offset"))

	cacheKey := ""
	cacheTTL := h.cfg.ProxyWebCacheTTL
	setCacheHeaders(c, cacheTTL, true)
	cacheAttempted := h.redis != nil && cacheTTL > 0
	if cacheAttempted {
		cacheKey = buildProxyFacetsCacheKey(facetType, limit, offset, loadProxyCacheVersion(c, h.redis))
		if cachedPayload, ok := h.getCachedPayload(c, cacheKey); ok {
			proxylistCacheHits.WithLabelValues("facets", "web").Inc()
			if shouldLogCache(h.cfg.LogLevel) {
				log.Printf("[cache] proxylist facets hit type=%s key=%s", facetType, cacheKey)
			}
			if meta, ok := cachedPayload["meta"].(map[string]any); ok {
				meta["cached"] = true
				meta["cache_age"] = h.getCacheAgeSeconds(c)
				if lastSync := h.getLastSyncTimestamp(c); !lastSync.IsZero() {
					meta["last_sync"] = lastSync.UTC().Format(time.RFC3339)
				}
			}
			c.JSON(http.StatusOK, cachedPayload)
			return
		}
		proxylistCacheMisses.WithLabelValues("facets", "web").Inc()
		if shouldLogCache(h.cfg.LogLevel) {
			log.Printf("[cache] proxylist facets miss type=%s key=%s", facetType, cacheKey)
		}
	}

	facets, err := h.proxyStore.ListProxyFacets(c.Request.Context(), facetType, limit, offset)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "DATABASE_ERROR", "failed to load facets", nil)
		return
	}

	total, err := h.proxyStore.CountProxyFacets(c.Request.Context(), facetType)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "DATABASE_ERROR", "failed to load facets", nil)
		return
	}

	payload := gin.H{
		"data": facets,
		"meta": gin.H{
			"total":  total,
			"limit":  limit,
			"offset": offset,
		},
	}
	if meta, ok := payload["meta"].(gin.H); ok {
		meta["cached"] = false
		meta["cache_age"] = h.getCacheAgeSeconds(c)
		if lastSync := h.getLastSyncTimestamp(c); !lastSync.IsZero() {
			meta["last_sync"] = lastSync.UTC().Format(time.RFC3339)
		}
	}

	if h.redis != nil && cacheTTL > 0 && cacheKey != "" {
		if raw, err := json.Marshal(payload); err == nil {
			_ = h.redis.Set(c, cacheKey, raw, cacheTTL).Err()
		}
	}

	c.JSON(http.StatusOK, payload)
}

func (h *Handler) requireAPIKey(c *gin.Context) (string, bool) {
	if len(h.apiKeys) == 0 {
		RespondError(c, http.StatusServiceUnavailable, "API_KEYS_NOT_CONFIGURED", "api keys not configured", nil)
		return "", false
	}

	authHeader := c.GetHeader("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing api key", nil)
		return "", false
	}

	token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if token == "" {
		RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing api key", nil)
		return "", false
	}

	for _, key := range h.apiKeys {
		if key == "" {
			continue
		}
		if subtle.ConstantTimeCompare([]byte(token), []byte(key)) == 1 {
			return token, true
		}
	}

	RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "invalid api key", nil)
	return "", false
}

func (h *Handler) getCachedPayload(c *gin.Context, cacheKey string) (map[string]any, bool) {
	if h.redis == nil || cacheKey == "" {
		return nil, false
	}
	cached, err := h.redis.Get(c, cacheKey).Result()
	if err != nil || cached == "" {
		return nil, false
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(cached), &payload); err != nil {
		return nil, false
	}
	return payload, true
}

func (h *Handler) getCacheAgeSeconds(c *gin.Context) int {
	if h.redis == nil {
		return 0
	}
	lastSync, err := h.redis.Get(c, "proxylist:last_sync").Result()
	if err != nil || lastSync == "" {
		return 0
	}
	ts, err := strconv.ParseInt(lastSync, 10, 64)
	if err != nil || ts <= 0 {
		return 0
	}
	age := time.Since(time.Unix(ts, 0)).Seconds()
	if age < 0 {
		return 0
	}
	return int(age)
}

func (h *Handler) getLastSyncTimestamp(c *gin.Context) time.Time {
	if h.redis == nil {
		return time.Time{}
	}
	lastSync, err := h.redis.Get(c, "proxylist:last_sync").Result()
	if err != nil || lastSync == "" {
		return time.Time{}
	}
	ts, err := strconv.ParseInt(lastSync, 10, 64)
	if err != nil || ts <= 0 {
		return time.Time{}
	}
	return time.Unix(ts, 0).UTC()
}

func buildProxyListFilters(c *gin.Context, limitDefault, limitMax int) store.ProxyListFilters {
	return store.ProxyListFilters{
		CountryCode: sanitizeCountry(c.Query("country")),
		Protocol:    sanitizeProtocol(c.Query("protocol")),
		Port:        parsePort(c.Query("port")),
		Anonymity:   sanitizeAnonymity(c.Query("anonymity")),
		City:        sanitizeLabel(c.Query("city")),
		Region:      sanitizeLabel(c.Query("region")),
		ASN:         parseASN(c.Query("asn")),
		Limit:       parseLimit(c.Query("limit"), limitDefault, limitMax),
		Offset:      parseOffset(c.Query("offset")),
	}
}

func sanitizeCountry(value string) string {
	value = strings.TrimSpace(value)
	if len(value) != 2 {
		return ""
	}
	return strings.ToUpper(value)
}

func sanitizeProtocol(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	switch value {
	case "http", "https", "socks4", "socks5":
		return value
	default:
		return ""
	}
}

func sanitizeAnonymity(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	switch value {
	case "elite", "anonymous", "transparent":
		return value
	default:
		return ""
	}
}

func sanitizeLabel(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if len(value) > 64 {
		value = value[:64]
	}
	cleaned := strings.Map(func(r rune) rune {
		switch {
		case unicode.IsLetter(r), unicode.IsDigit(r), r == ' ', r == '-', r == '\'', r == '.':
			return r
		default:
			return -1
		}
	}, value)
	return strings.TrimSpace(cleaned)
}

func parsePort(value string) int {
	if value == "" {
		return 0
	}
	port, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || port < 1 || port > 65535 {
		return 0
	}
	return port
}

func parseOffset(value string) int {
	if value == "" {
		return 0
	}
	offset, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || offset < 0 {
		return 0
	}
	if offset > 100000 {
		return 100000
	}
	return offset
}

func parseASN(value string) int {
	if value == "" {
		return 0
	}
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed <= 0 {
		return 0
	}
	return parsed
}

func cacheKeyPart(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "-"
	}
	return url.PathEscape(value)
}

func shouldLogCache(level string) bool {
	return strings.EqualFold(strings.TrimSpace(level), "debug")
}

func cacheKeyInt(value int, allowZero bool) string {
	if value == 0 && allowZero {
		return "0"
	}
	if value <= 0 {
		return "-"
	}
	return strconv.Itoa(value)
}

func buildProxyCacheKey(filters store.ProxyListFilters, authenticated bool, version string) string {
	scope := "web"
	if authenticated {
		scope = "api"
	}
	if version == "" {
		version = "0"
	}
	parts := []string{
		"proxylist",
		"v",
		version,
		"list",
		scope,
		cacheKeyPart(filters.CountryCode),
		cacheKeyPart(filters.Protocol),
		cacheKeyInt(filters.Port, false),
		cacheKeyPart(filters.Anonymity),
		cacheKeyPart(filters.City),
		cacheKeyPart(filters.Region),
		cacheKeyInt(filters.ASN, false),
		cacheKeyInt(filters.Limit, true),
		cacheKeyInt(filters.Offset, true),
	}
	return strings.Join(parts, ":")
}

func buildProxyFacetsCacheKey(facetType string, limit, offset int, version string) string {
	if version == "" {
		version = "0"
	}
	return fmt.Sprintf("proxylist:v:%s:facets:%s:%d:%d", version, facetType, limit, offset)
}

func buildProxyStatsCacheKey(version string) string {
	if version == "" {
		version = "0"
	}
	return fmt.Sprintf("proxylist:v:%s:stats", version)
}

func buildProxyRecentCacheKey(limit int, version string) string {
	if version == "" {
		version = "0"
	}
	return fmt.Sprintf("proxylist:v:%s:recent:%d", version, limit)
}

func transformProxyRecord(record store.ProxyListRecord) ProxyListItem {
	protocols := make([]string, 0, 4)
	if record.HTTP == 1 {
		protocols = append(protocols, "HTTP")
	}
	if record.SSL == 1 {
		protocols = append(protocols, "HTTPS")
	}
	if record.Socks4 == 1 {
		protocols = append(protocols, "SOCKS4")
	}
	if record.Socks5 == 1 {
		protocols = append(protocols, "SOCKS5")
	}

	anonymity := "Unknown"
	switch record.Anon {
	case 0, 1:
		anonymity = "Transparent"
	case 2, 3:
		anonymity = "Anonymous"
	case 4, 5:
		anonymity = "Elite"
	}

	uptime := 0
	totalChecks := record.ChecksUp + record.ChecksDown
	if totalChecks > 0 {
		uptime = int(float64(record.ChecksUp) / float64(totalChecks) * 100)
	}

	lastSeen := ""
	if !record.LastSeen.IsZero() {
		lastSeen = record.LastSeen.UTC().Format(time.RFC3339)
	}

	return ProxyListItem{
		Host:           record.Host,
		IP:             record.IP,
		Port:           record.Port,
		Delay:          record.Delay,
		CountryCode:    record.CountryCode,
		CountryName:    record.CountryName,
		City:           record.City,
		Region:         record.Region,
		ASN:            record.ASN,
		ASNName:        record.ASNName,
		Org:            record.Org,
		ContinentCode:  record.ContinentCode,
		ChecksUp:       record.ChecksUp,
		ChecksDown:     record.ChecksDown,
		Anon:           record.Anon,
		HTTP:           record.HTTP,
		SSL:            record.SSL,
		Socks4:         record.Socks4,
		Socks5:         record.Socks5,
		Protocols:      protocols,
		AnonymityLevel: anonymity,
		Uptime:         uptime,
		LastSeen:       lastSeen,
	}
}

func buildPlainProxyList(items []ProxyListItem) string {
	lines := make([]string, 0, len(items))
	for _, item := range items {
		lines = append(lines, fmt.Sprintf("%s:%d", item.IP, item.Port))
	}
	return strings.Join(lines, "\n")
}

func buildProxyCSV(items []ProxyListItem) ([]byte, error) {
	buf := &bytes.Buffer{}
	writer := csv.NewWriter(buf)
	header := []string{
		"ip",
		"port",
		"country_code",
		"country_name",
		"city",
		"region",
		"asn",
		"asn_name",
		"org",
		"protocols",
		"anonymity",
		"uptime",
		"delay_ms",
		"last_seen",
	}
	if err := writer.Write(header); err != nil {
		return nil, err
	}

	for _, item := range items {
		record := []string{
			item.IP,
			strconv.Itoa(item.Port),
			item.CountryCode,
			item.CountryName,
			item.City,
			item.Region,
			intToString(item.ASN),
			item.ASNName,
			item.Org,
			strings.Join(item.Protocols, "|"),
			item.AnonymityLevel,
			strconv.Itoa(item.Uptime),
			strconv.Itoa(item.Delay),
			item.LastSeen,
		}
		if err := writer.Write(record); err != nil {
			return nil, err
		}
	}

	writer.Flush()
	return buf.Bytes(), writer.Error()
}

func buildClashConfig(items []ProxyListItem) string {
	var builder strings.Builder
	builder.WriteString("proxies:\n")
	for idx, item := range items {
		proxyType, tls := preferredProxyType(item)
		name := fmt.Sprintf("proxy-%d-%s", idx+1, item.IP)
		builder.WriteString(fmt.Sprintf("  - name: \"%s\"\n", name))
		builder.WriteString(fmt.Sprintf("    type: %s\n", proxyType))
		builder.WriteString(fmt.Sprintf("    server: %s\n", item.IP))
		builder.WriteString(fmt.Sprintf("    port: %d\n", item.Port))
		if tls {
			builder.WriteString("    tls: true\n")
		}
	}
	return builder.String()
}

func buildSurfsharkList(items []ProxyListItem) string {
	lines := make([]string, 0, len(items))
	for _, item := range items {
		scheme := preferredProxyScheme(item)
		lines = append(lines, fmt.Sprintf("%s://%s:%d", scheme, item.IP, item.Port))
	}
	return strings.Join(lines, "\n")
}

func preferredProxyType(item ProxyListItem) (string, bool) {
	switch {
	case item.Socks5 == 1:
		return "socks5", false
	case item.Socks4 == 1:
		return "socks4", false
	case item.SSL == 1:
		return "http", true
	case item.HTTP == 1:
		return "http", false
	default:
		return "http", false
	}
}

func preferredProxyScheme(item ProxyListItem) string {
	switch {
	case item.Socks5 == 1:
		return "socks5"
	case item.Socks4 == 1:
		return "socks4"
	case item.SSL == 1:
		return "https"
	case item.HTTP == 1:
		return "http"
	default:
		return "http"
	}
}

func intToString(value int) string {
	if value == 0 {
		return ""
	}
	return strconv.Itoa(value)
}

func rateWindowReset(window time.Duration) int64 {
	if window <= 0 {
		return 0
	}
	now := time.Now().UTC()
	windowStart := now.Truncate(window)
	return windowStart.Add(window).Unix()
}

func setCacheHeaders(c *gin.Context, ttl time.Duration, publicCache bool) {
	if ttl <= 0 {
		c.Header("Cache-Control", "no-store")
		return
	}
	seconds := int(ttl.Seconds())
	if seconds <= 0 {
		c.Header("Cache-Control", "no-store")
		return
	}
	scope := "public"
	if !publicCache {
		scope = "private"
	}
	stale := seconds * 3
	c.Header("Cache-Control", fmt.Sprintf("%s, max-age=%d, s-maxage=%d, stale-while-revalidate=%d", scope, seconds, seconds, stale))
}

func buildProxyListETag(data []ProxyListItem, meta ProxyListMeta) string {
	if len(data) == 0 && meta.Total == 0 {
		return ""
	}
	etagPayload := struct {
		Data []ProxyListItem `json:"data"`
		Meta struct {
			Total    int    `json:"total"`
			Limit    int    `json:"limit"`
			Offset   int    `json:"offset"`
			LastSync string `json:"last_sync,omitempty"`
		} `json:"meta"`
	}{
		Data: data,
	}
	etagPayload.Meta.Total = meta.Total
	etagPayload.Meta.Limit = meta.Limit
	etagPayload.Meta.Offset = meta.Offset
	etagPayload.Meta.LastSync = meta.LastSync

	raw, err := json.Marshal(etagPayload)
	if err != nil {
		return ""
	}
	hash := sha256.Sum256(raw)
	return fmt.Sprintf(`W/"%x"`, hash)
}

func writeETagAndCheck(c *gin.Context, etag string) bool {
	if etag == "" {
		return false
	}
	c.Header("ETag", etag)
	ifNoneMatch := c.GetHeader("If-None-Match")
	if ifNoneMatch == "" {
		return false
	}
	if matchETag(ifNoneMatch, etag) {
		c.Status(http.StatusNotModified)
		return true
	}
	return false
}

func matchETag(ifNoneMatch, etag string) bool {
	normalized := normalizeETag(etag)
	for _, candidate := range strings.Split(ifNoneMatch, ",") {
		tag := strings.TrimSpace(candidate)
		if tag == "*" {
			return true
		}
		if normalizeETag(tag) == normalized {
			return true
		}
	}
	return false
}

func normalizeETag(tag string) string {
	trimmed := strings.TrimSpace(tag)
	trimmed = strings.TrimPrefix(trimmed, "W/")
	trimmed = strings.TrimPrefix(trimmed, "w/")
	trimmed = strings.Trim(trimmed, "\"")
	return trimmed
}
