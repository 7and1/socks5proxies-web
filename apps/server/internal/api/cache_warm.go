package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"socksproxies.com/server/internal/store"
)

const (
	warmRecentLimit = 10
	warmCountryLimit = 20
	warmPageLimit    = 25
)

// WarmProxyCaches precomputes high-traffic cache entries after a sync.
func (h *Handler) WarmProxyCaches(ctx context.Context) {
	if h == nil || h.redis == nil || h.proxyStore == nil {
		return
	}
	warmCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	lastSync := loadLastSyncTimestamp(warmCtx, h.redis)

	// Stats cache
	if stats, err := h.proxyStore.GetProxyStats(warmCtx); err == nil {
		meta := gin.H{
			"cached":    true,
			"cache_age": 0,
		}
		if !lastSync.IsZero() {
			meta["last_sync"] = lastSync.Format(time.RFC3339)
		}
		payload := gin.H{
			"data": stats,
			"meta": meta,
		}
		if raw, err := json.Marshal(payload); err == nil {
			_ = h.redis.Set(warmCtx, "proxylist:stats", raw, time.Minute).Err()
		}
	}

	// Recent proxies cache
	if records, err := h.proxyStore.ListRecentProxies(warmCtx, warmRecentLimit); err == nil {
		data := make([]ProxyListItem, 0, len(records))
		for _, record := range records {
			data = append(data, transformProxyRecord(record))
		}
		meta := gin.H{
			"cached":    true,
			"cache_age": 0,
			"limit":     warmRecentLimit,
		}
		if !lastSync.IsZero() {
			meta["last_sync"] = lastSync.Format(time.RFC3339)
		}
		payload := gin.H{
			"data": data,
			"meta": meta,
		}
		if raw, err := json.Marshal(payload); err == nil {
			key := fmt.Sprintf("proxylist:recent:%d", warmRecentLimit)
			_ = h.redis.Set(warmCtx, key, raw, 30*time.Second).Err()
		}
	}

	// Top country pages (public web cache)
	facets, err := h.proxyStore.ListProxyFacets(warmCtx, "country", warmCountryLimit, 0)
	if err != nil {
		return
	}
	cacheTTL := h.cfg.ProxyWebCacheTTL
	if cacheTTL <= 0 {
		return
	}

	for _, facet := range facets {
		code := strings.ToUpper(strings.TrimSpace(facet.Key))
		if code == "" {
			continue
		}
		filters := store.ProxyListFilters{
			CountryCode: code,
			Limit:       warmPageLimit,
			Offset:      0,
		}
		records, total, err := h.proxyStore.ListProxyList(warmCtx, filters)
		if err != nil {
			continue
		}
		data := make([]ProxyListItem, 0, len(records))
		for _, record := range records {
			data = append(data, transformProxyRecord(record))
		}
		meta := ProxyListMeta{
			Total:    total,
			Limit:    filters.Limit,
			Offset:   filters.Offset,
			Cached:   true,
			CacheAge: 0,
		}
		if !lastSync.IsZero() {
			meta.LastSync = lastSync.Format(time.RFC3339)
		}
		payload := struct {
			Data []ProxyListItem `json:"data"`
			Meta ProxyListMeta   `json:"meta"`
		}{
			Data: data,
			Meta: meta,
		}
		if raw, err := json.Marshal(payload); err == nil {
			cacheKey := buildProxyCacheKey(filters, false)
			_ = h.redis.Set(warmCtx, cacheKey, raw, cacheTTL).Err()
		}
	}
}

func (h *Handler) WarmCacheEndpoint(c *gin.Context) {
	if h.redis == nil || h.proxyStore == nil {
		RespondError(c, http.StatusServiceUnavailable, "CACHE_UNAVAILABLE", "cache or store not configured", nil)
		return
	}

	go h.WarmProxyCaches(c.Request.Context())

	c.JSON(http.StatusAccepted, gin.H{
		"status":  "accepted",
		"message": "cache warm started",
	})
}

func loadLastSyncTimestamp(ctx context.Context, redisClient redisClient) time.Time {
	if redisClient == nil {
		return time.Time{}
	}
	lastSync, err := redisClient.Get(ctx, "proxylist:last_sync").Result()
	if err != nil || lastSync == "" {
		return time.Time{}
	}
	ts, err := strconv.ParseInt(lastSync, 10, 64)
	if err != nil || ts <= 0 {
		return time.Time{}
	}
	return time.Unix(ts, 0).UTC()
}

// redisClient is a narrow interface for testing / dependency isolation.
type redisClient interface {
	Get(ctx context.Context, key string) *redis.StringCmd
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd
}
