package api

import (
	"bytes"
	"crypto/subtle"
	"encoding/csv"
	"encoding/json"
	"fmt"
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

	cacheKey := "proxylist:stats"
	cacheTTL := time.Minute
	if h.redis != nil && cacheTTL > 0 {
		if cachedPayload, ok := h.getCachedPayload(c, cacheKey); ok {
			if meta, ok := cachedPayload["meta"].(map[string]any); ok {
				meta["cached"] = true
				meta["cache_age"] = h.getCacheAgeSeconds(c)
			}
			c.JSON(http.StatusOK, cachedPayload)
			return
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
	cacheKey := fmt.Sprintf("proxylist:recent:%d", limit)
	cacheTTL := 30 * time.Second
	if h.redis != nil && cacheTTL > 0 {
		if cachedPayload, ok := h.getCachedPayload(c, cacheKey); ok {
			if meta, ok := cachedPayload["meta"].(map[string]any); ok {
				meta["cached"] = true
				meta["cache_age"] = h.getCacheAgeSeconds(c)
			}
			c.JSON(http.StatusOK, cachedPayload)
			return
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
	records, err := h.proxyStore.ListRandomProxies(c.Request.Context(), limit)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "DATABASE_ERROR", "failed to load random proxies", nil)
		return
	}

	data := make([]ProxyListItem, 0, len(records))
	for _, record := range records {
		data = append(data, transformProxyRecord(record))
	}

	c.JSON(http.StatusOK, gin.H{
		"data": data,
		"meta": gin.H{
			"limit":     limit,
			"cache_age": h.getCacheAgeSeconds(c),
		},
	})
}

func (h *Handler) ExportProxyList(c *gin.Context) {
	if h.proxyStore == nil {
		RespondError(c, http.StatusServiceUnavailable, "PROXYLIST_UNAVAILABLE", "proxy list not configured", nil)
		return
	}

	format := strings.ToLower(strings.TrimPrefix(c.Param("format"), "."))
	filters := buildProxyListFilters(c, 500, 5000)

	records, _, err := h.proxyStore.ListProxyList(c.Request.Context(), filters)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "DATABASE_ERROR", "failed to export proxies", nil)
		return
	}

	data := make([]ProxyListItem, 0, len(records))
	for _, record := range records {
		data = append(data, transformProxyRecord(record))
	}

	filename := fmt.Sprintf("proxy-export-%s-%s.%s", filters.Protocol, time.Now().UTC().Format("2006-01-02"), format)
	if filters.Protocol == "" {
		filename = fmt.Sprintf("proxy-export-%s.%s", time.Now().UTC().Format("2006-01-02"), format)
	}

	switch format {
	case "txt", "text", "list":
		payload := buildPlainProxyList(data)
		c.Header("Content-Type", "text/plain; charset=utf-8")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
		c.String(http.StatusOK, payload)
	case "csv":
		payload, err := buildProxyCSV(data)
		if err != nil {
			RespondError(c, http.StatusInternalServerError, "EXPORT_ERROR", "failed to build csv export", nil)
			return
		}
		c.Header("Content-Type", "text/csv; charset=utf-8")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
		c.Data(http.StatusOK, "text/csv; charset=utf-8", payload)
	case "json":
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
		c.JSON(http.StatusOK, gin.H{"data": data})
	case "clash":
		payload := buildClashConfig(data)
		c.Header("Content-Type", "text/yaml; charset=utf-8")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
		c.String(http.StatusOK, payload)
	case "surfshark":
		payload := buildSurfsharkList(data)
		c.Header("Content-Type", "text/plain; charset=utf-8")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
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

	filters := buildProxyListFilters(c, 25, 100)

	cacheKey := ""
	cacheTTL := h.cfg.ProxyWebCacheTTL
	if authenticated {
		cacheTTL = h.cfg.ProxyAPICacheTTL
	}
	if h.redis != nil && cacheTTL > 0 {
		cacheKey = buildProxyCacheKey(filters, authenticated)
		if cachedPayload, ok := h.getCachedPayload(c, cacheKey); ok {
			cacheAge := h.getCacheAgeSeconds(c)
			if meta, ok := cachedPayload["meta"].(map[string]any); ok {
				meta["cached"] = true
				meta["cache_age"] = cacheAge
			}
			c.JSON(http.StatusOK, cachedPayload)
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
	payload := gin.H{
		"data": data,
		"meta": gin.H{
			"total":     total,
			"limit":     filters.Limit,
			"offset":    filters.Offset,
			"cached":    false,
			"cache_age": cacheAge,
		},
	}

	if h.redis != nil && cacheTTL > 0 && cacheKey != "" {
		if raw, err := json.Marshal(payload); err == nil {
			_ = h.redis.Set(c, cacheKey, raw, cacheTTL).Err()
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
	if h.redis != nil && cacheTTL > 0 {
		cacheKey = "proxylist:facets:" + facetType + ":" + strconv.Itoa(limit) + ":" + strconv.Itoa(offset)
		if cachedPayload, ok := h.getCachedPayload(c, cacheKey); ok {
			c.JSON(http.StatusOK, cachedPayload)
			return
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

func buildProxyCacheKey(filters store.ProxyListFilters, authenticated bool) string {
	values := url.Values{}
	if filters.CountryCode != "" {
		values.Set("country", filters.CountryCode)
	}
	if filters.Protocol != "" {
		values.Set("protocol", filters.Protocol)
	}
	if filters.Port > 0 {
		values.Set("port", strconv.Itoa(filters.Port))
	}
	if filters.Anonymity != "" {
		values.Set("anonymity", filters.Anonymity)
	}
	if filters.City != "" {
		values.Set("city", filters.City)
	}
	if filters.Region != "" {
		values.Set("region", filters.Region)
	}
	if filters.ASN > 0 {
		values.Set("asn", strconv.Itoa(filters.ASN))
	}
	if filters.Limit > 0 {
		values.Set("limit", strconv.Itoa(filters.Limit))
	}
	if filters.Offset > 0 {
		values.Set("offset", strconv.Itoa(filters.Offset))
	}

	prefix := "proxylist:web"
	if authenticated {
		prefix = "proxylist:api"
	}
	return prefix + ":" + values.Encode()
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
