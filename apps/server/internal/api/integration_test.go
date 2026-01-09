package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"socksproxies.com/server/internal/config"
	"socksproxies.com/server/internal/store"
)

func TestHealthEndpoint_Integration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Load()

	// Use OpenStore to get UnifiedStore
	st, err := store.OpenStore("", "", t.TempDir()+"/test.db")
	require.NoError(t, err)
	defer st.Close()

	h := NewHandler(cfg, st, nil)
	router := NewRouter(cfg)
	router.GET("/api/health", h.Health)

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var response map[string]interface{}
	err = json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "ok", response["status"])
	assert.Contains(t, response, "database")
	assert.Contains(t, response, "proxies_count")
}

func TestListProxiesEndpoint_Integration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Load()

	st, err := store.OpenStore("", "", t.TempDir()+"/test.db")
	require.NoError(t, err)
	defer st.Close()

	// Insert test proxy list record
	ctx := context.Background()
	_, err = st.UpsertProxyListBatch(ctx, []store.ProxyListRecord{
		{
			Host:        "1.1.1.1",
			IP:          "1.1.1.1",
			Port:        8080,
			CountryCode: "US",
			CountryName: "United States",
			City:        "Dallas",
			Region:      "Texas",
			ASN:         15169,
			ASNName:     "Google LLC",
			Org:         "Google",
			Delay:       120,
			ChecksUp:    10,
			ChecksDown:  2,
			Anon:        4,
			HTTP:        1,
			SSL:         1,
			Socks4:      0,
			Socks5:      1,
			LastSeen:    time.Now().UTC(),
		},
	})
	require.NoError(t, err)

	h := NewHandler(cfg, st, nil)
	router := NewRouter(cfg)
	router.GET("/api/proxies", h.ListProxyListPublic)

	req := httptest.NewRequest(http.MethodGet, "/api/proxies?limit=10", nil)
	req.Header.Set("X-Real-IP", "127.0.0.1")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var response map[string]interface{}
	err = json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "data")
	assert.Contains(t, response, "meta")

	// Filter by city
	reqCity := httptest.NewRequest(http.MethodGet, "/api/proxies?city=Dallas", nil)
	reqCity.Header.Set("X-Real-IP", "127.0.0.1")
	recCity := httptest.NewRecorder()
	router.ServeHTTP(recCity, reqCity)
	assert.Equal(t, http.StatusOK, recCity.Code)

	// Filter by ASN
	reqASN := httptest.NewRequest(http.MethodGet, "/api/proxies?asn=15169", nil)
	reqASN.Header.Set("X-Real-IP", "127.0.0.1")
	recASN := httptest.NewRecorder()
	router.ServeHTTP(recASN, reqASN)
	assert.Equal(t, http.StatusOK, recASN.Code)

	// ASN details endpoint
	router.GET("/api/asn/:asn", h.GetASNDetails)
	reqASNDetails := httptest.NewRequest(http.MethodGet, "/api/asn/15169", nil)
	recASNDetails := httptest.NewRecorder()
	router.ServeHTTP(recASNDetails, reqASNDetails)
	assert.Equal(t, http.StatusOK, recASNDetails.Code)
}

func TestListProxiesRateLimit_Integration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Load()
	cfg.APIKeys = []string{"test-key"}
	cfg.APIRateLimitHour = 2

	st, err := store.OpenStore("", "", t.TempDir()+"/test.db")
	require.NoError(t, err)
	defer st.Close()

	h := NewHandler(cfg, st, nil)
	router := NewRouter(cfg)
	router.GET("/api/v1/proxies", h.ListProxyListAuth)

	// First request - should succeed
	req1 := httptest.NewRequest(http.MethodGet, "/api/v1/proxies", nil)
	req1.Header.Set("Authorization", "Bearer test-key")
	req1.Header.Set("X-Real-IP", "127.0.0.1")
	rec1 := httptest.NewRecorder()
	router.ServeHTTP(rec1, req1)
	assert.Equal(t, http.StatusOK, rec1.Code)

	// Second request - should succeed
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/proxies", nil)
	req2.Header.Set("Authorization", "Bearer test-key")
	req2.Header.Set("X-Real-IP", "127.0.0.1")
	rec2 := httptest.NewRecorder()
	router.ServeHTTP(rec2, req2)
	assert.Equal(t, http.StatusOK, rec2.Code)

	// Third request - should be rate limited
	req3 := httptest.NewRequest(http.MethodGet, "/api/v1/proxies", nil)
	req3.Header.Set("Authorization", "Bearer test-key")
	req3.Header.Set("X-Real-IP", "127.0.0.1")
	rec3 := httptest.NewRecorder()
	router.ServeHTTP(rec3, req3)
	assert.Equal(t, http.StatusTooManyRequests, rec3.Code)
}

func TestWhoamiEndpoint_Integration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Load()

	st, err := store.OpenStore("", "", t.TempDir()+"/test.db")
	require.NoError(t, err)
	defer st.Close()

	h := NewHandler(cfg, st, nil)
	router := NewRouter(cfg)
	router.GET("/api/whoami", h.Whoami)

	req := httptest.NewRequest(http.MethodGet, "/api/whoami", nil)
	req.Header.Set("User-Agent", "test-agent")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var response map[string]interface{}
	err = json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "ip")
	assert.Contains(t, response, "headers")
	assert.Contains(t, response, "agent")
}

func TestStoreOperations_Integration(t *testing.T) {
	ctx := context.Background()

	st, err := store.OpenStore("", "", t.TempDir()+"/test.db")
	require.NoError(t, err)
	defer st.Close()

	// Test UpsertProxy
	proxyID, err := st.UpsertProxy(ctx, store.ProxyRecord{
		Address:     "2.2.2.2:1080",
		Protocol:    "socks5",
		Country:     "GB",
		Anonymity:   "elite",
		LastStatus:  true,
		LastLatency: 150,
		LastChecked: time.Now().UTC(),
	})
	require.NoError(t, err)
	assert.Greater(t, proxyID, int64(0))

	// Test InsertCheck
	err = st.InsertCheck(ctx, store.CheckRecord{
		ProxyID:   proxyID,
		Status:    true,
		Latency:   120,
		CheckedAt: time.Now().UTC(),
		IP:        "2.2.2.2",
		Country:   "GB",
		Anonymity: "elite",
	})
	require.NoError(t, err)

	// Test CountProxies
	count, err := st.CountProxies(ctx)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, count, 1)

	// Test ListProxies
	proxies, err := st.ListProxies(ctx, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(proxies), 1)
}

func TestDatabaseConnection_Integration(t *testing.T) {
	// Test SQLite connection
	st, err := store.OpenStore("", "", t.TempDir()+"/test_connection.db")
	require.NoError(t, err)
	defer st.Close()

	ctx := context.Background()
	count, err := st.CountProxies(ctx)
	require.NoError(t, err)
	assert.Equal(t, 0, count)
}
