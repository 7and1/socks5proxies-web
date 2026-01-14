package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/alicebob/miniredis/v2"

	"socksproxies.com/server/internal/config"
	"socksproxies.com/server/internal/store"
	"github.com/redis/go-redis/v9"
)

type mockRedisClient struct {
	data map[string]string
}

func newMockRedisClient() *mockRedisClient {
	return &mockRedisClient{
		data: make(map[string]string),
	}
}

func (m *mockRedisClient) Get(ctx context.Context, key string) *redis.StringCmd {
	return redis.NewStringCmd(ctx)
}

func (m *mockRedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd {
	m.data[key] = value.(string)
	return redis.NewStatusCmd(ctx)
}

func (m *mockRedisClient) Del(ctx context.Context, keys ...string) *redis.IntCmd {
	return redis.NewIntCmd(ctx)
}

func (m *mockRedisClient) Ping(ctx context.Context) *redis.StatusCmd {
	return redis.NewStatusCmd(ctx)
}

func TestWarmCacheEndpoint_NoRedis(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{}
	h := newTestHandler(mockStore, nil)

	router := gin.New()
	router.POST("/api/cache/warm", h.WarmCacheEndpoint)

	req := httptest.NewRequest(http.MethodPost, "/api/cache/warm", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rec.Code)
	}
}

func TestWarmCacheEndpoint_NoProxyStore(t *testing.T) {
	gin.SetMode(gin.TestMode)

	s := miniredis.RunT(t)
	redisClient := redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})

	h := &Handler{
		cfg:        config.Config{},
		store:      &mockUnifiedStore{},
		proxyStore: nil,
		redis:      redisClient,
		apiLimit:   100,
	}

	router := gin.New()
	router.POST("/api/cache/warm", h.WarmCacheEndpoint)

	req := httptest.NewRequest(http.MethodPost, "/api/cache/warm", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rec.Code)
	}
}

func TestWarmCacheEndpoint_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	s := miniredis.RunT(t)
	redisClient := redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})

	mockStore := &mockProxyListStore{
		records: []store.ProxyListRecord{
			{
				IP:          "192.168.1.1",
				Port:        8080,
				CountryCode: "US",
				LastSeen:    time.Now(),
			},
		},
		total: 1,
		stats: store.ProxyStats{
			Total:     1,
			Countries: 1,
			AvgUptime: 95,
			Protocols: store.ProxyProtocolStats{
				HTTP:   1,
				Socks5: 1,
			},
		},
		facets: []store.FacetRecord{
			{Type: "country", Key: "US", Count: 100, AvgDelay: 150},
		},
	}

	cfg := config.Config{
		ProxyWebCacheTTL: time.Minute,
	}

	h := &Handler{
		cfg:                cfg,
		store:              &mockUnifiedStore{mockProxyListStore: mockStore},
		proxyStore:         mockStore,
		redis:              redisClient,
		apiLimit:           100,
		apiRateLimitWindow: time.Hour,
	}

	router := gin.New()
	router.POST("/api/cache/warm", h.WarmCacheEndpoint)

	req := httptest.NewRequest(http.MethodPost, "/api/cache/warm", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected status 202, got %d: %s", rec.Code, rec.Body.String())
	}

	// Give background goroutine time to complete
	time.Sleep(100 * time.Millisecond)

	// Verify cache was populated
	ctx := context.Background()
	version, _ := redisClient.Get(ctx, "proxylist:version").Result()
	statsKey := buildProxyStatsCacheKey(version)
	if exists, _ := redisClient.Exists(ctx, statsKey).Result(); exists == 0 {
		t.Error("expected stats cache to be set")
	}
}

func TestWarmProxyCaches_NilHandler(t *testing.T) {
	var h *Handler
	h.WarmProxyCaches(context.Background())
	// Should not panic
}

func TestWarmProxyCaches_NoRedis(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{}
	h := newTestHandler(mockStore, nil)

	h.WarmProxyCaches(context.Background())
	// Should not panic
}

func TestWarmProxyCaches_NoProxyStore(t *testing.T) {
	gin.SetMode(gin.TestMode)

	s := miniredis.RunT(t)
	defer s.Close()
	redisClient := redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})

	h := &Handler{
		cfg:        config.Config{},
		store:      &mockUnifiedStore{},
		proxyStore: nil,
		redis:      redisClient,
	}

	h.WarmProxyCaches(context.Background())
	// Should not panic
}

func TestLoadLastSyncTimestamp_NoRedis(t *testing.T) {
	var r redisClient = nil
	result := loadLastSyncTimestamp(context.Background(), r)
	if !result.IsZero() {
		t.Error("expected zero time when redis is nil")
	}
}

func TestLoadLastSyncTimestamp_EmptyKey(t *testing.T) {
	s := miniredis.RunT(t)
	defer s.Close()
	redisClient := redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})

	ctx := context.Background()
	result := loadLastSyncTimestamp(ctx, redisClient)
	if !result.IsZero() {
		t.Error("expected zero time when key is empty")
	}
}

func TestLoadLastSyncTimestamp_ValidTimestamp(t *testing.T) {
	s := miniredis.RunT(t)
	defer s.Close()
	redisClient := redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})

	ctx := context.Background()
	expectedTime := time.Now().UTC().Truncate(time.Second)
	ts := expectedTime.Unix()
	redisClient.Set(ctx, "proxylist:last_sync", ts, 0)

	result := loadLastSyncTimestamp(ctx, redisClient)
	if result.Unix() != expectedTime.Unix() {
		t.Errorf("expected %d, got %d", expectedTime.Unix(), result.Unix())
	}
}
