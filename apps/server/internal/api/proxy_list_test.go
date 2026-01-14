package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"socksproxies.com/server/internal/config"
	"socksproxies.com/server/internal/store"
)

type mockProxyListStore struct {
	records []store.ProxyListRecord
	facets  []store.FacetRecord
	total   int
	stats   store.ProxyStats
	err     error
}

func (m *mockProxyListStore) UpsertProxyListBatch(ctx context.Context, records []store.ProxyListRecord) (int, error) {
	return 0, nil
}

func (m *mockProxyListStore) DeleteStaleProxies(ctx context.Context, cutoff time.Time) (int, error) {
	if m.err != nil {
		return 0, m.err
	}
	return 0, nil
}

func (m *mockProxyListStore) ListProxyList(ctx context.Context, filters store.ProxyListFilters) ([]store.ProxyListRecord, int, error) {
	if m.err != nil {
		return nil, 0, m.err
	}
	return m.records, m.total, nil
}

func (m *mockProxyListStore) ListRecentProxies(ctx context.Context, limit int) ([]store.ProxyListRecord, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.records, nil
}

func (m *mockProxyListStore) ListRandomProxies(ctx context.Context, limit int) ([]store.ProxyListRecord, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.records, nil
}

func (m *mockProxyListStore) ListProxyFacets(ctx context.Context, facetType string, limit, offset int) ([]store.FacetRecord, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.facets, nil
}

func (m *mockProxyListStore) CountProxyFacets(ctx context.Context, facetType string) (int, error) {
	if m.err != nil {
		return 0, m.err
	}
	return len(m.facets), nil
}

func (m *mockProxyListStore) GetASNDetails(ctx context.Context, asn int) (store.ASNDetails, error) {
	if m.err != nil {
		return store.ASNDetails{}, m.err
	}
	return store.ASNDetails{ASN: asn, Name: "Test ISP", Count: 10}, nil
}

func (m *mockProxyListStore) GetProxyStats(ctx context.Context) (store.ProxyStats, error) {
	if m.err != nil {
		return store.ProxyStats{}, m.err
	}
	return m.stats, nil
}

func (m *mockProxyListStore) RebuildProxyFacets(ctx context.Context) error {
	return nil
}

type mockUnifiedStore struct {
	*mockProxyListStore
}

func (m *mockUnifiedStore) UpsertProxy(ctx context.Context, record store.ProxyRecord) (int64, error) {
	return 0, nil
}

func (m *mockUnifiedStore) InsertCheck(ctx context.Context, record store.CheckRecord) error {
	return nil
}

func (m *mockUnifiedStore) ListProxies(ctx context.Context, limit int) ([]store.ProxyRecord, error) {
	return nil, nil
}

func (m *mockUnifiedStore) CountProxies(ctx context.Context) (int, error) {
	return 0, nil
}

func newTestHandler(proxyStore *mockProxyListStore, apiKeys []string) *Handler {
	cfg := config.Config{
		RateLimitPerDay:  100,
		APIRateLimitHour: 1000,
		APIKeys:          apiKeys,
	}

	unifiedStore := &mockUnifiedStore{mockProxyListStore: proxyStore}

	h := &Handler{
		cfg:        cfg,
		store:      unifiedStore,
		proxyStore: proxyStore,
		apiKeys:    apiKeys,
		apiLimit:   cfg.APIRateLimitHour,
	}
	return h
}

func TestListProxyListPublic_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{
		records: []store.ProxyListRecord{
			{
				IP:          "192.168.1.1",
				Port:        8080,
				Host:        "proxy1.example.com",
				CountryCode: "US",
				CountryName: "United States",
				HTTP:        1,
				Anon:        4,
				ChecksUp:    90,
				ChecksDown:  10,
				LastSeen:    time.Now(),
			},
		},
		total: 1,
	}

	h := newTestHandler(mockStore, nil)

	router := gin.New()
	router.GET("/api/proxies", h.ListProxyListPublic)

	req := httptest.NewRequest(http.MethodGet, "/api/proxies", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	data, ok := response["data"].([]interface{})
	if !ok {
		t.Fatal("expected data array in response")
	}
	if len(data) != 1 {
		t.Errorf("expected 1 proxy, got %d", len(data))
	}

	meta, ok := response["meta"].(map[string]interface{})
	if !ok {
		t.Fatal("expected meta object in response")
	}
	if meta["total"].(float64) != 1 {
		t.Errorf("expected total 1, got %v", meta["total"])
	}
}

func TestListProxyListPublic_WithFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{
		records: []store.ProxyListRecord{},
		total:   0,
	}

	h := newTestHandler(mockStore, nil)

	router := gin.New()
	router.GET("/api/proxies", h.ListProxyListPublic)

	req := httptest.NewRequest(http.MethodGet, "/api/proxies?country=US&protocol=socks5&port=1080&anonymity=elite&limit=10", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}

func TestListProxyListPublic_ETagNotModified(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{
		records: []store.ProxyListRecord{
			{
				IP:          "192.168.1.1",
				Port:        8080,
				Host:        "proxy1.example.com",
				CountryCode: "US",
				CountryName: "United States",
				HTTP:        1,
				Anon:        4,
				ChecksUp:    90,
				ChecksDown:  10,
				LastSeen:    time.Now(),
			},
		},
		total: 1,
	}

	h := newTestHandler(mockStore, nil)

	router := gin.New()
	router.GET("/api/proxies", h.ListProxyListPublic)

	req := httptest.NewRequest(http.MethodGet, "/api/proxies", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	etag := rec.Header().Get("ETag")
	if etag == "" {
		t.Fatal("expected ETag header to be set")
	}

	req2 := httptest.NewRequest(http.MethodGet, "/api/proxies", nil)
	req2.Header.Set("If-None-Match", etag)
	rec2 := httptest.NewRecorder()
	router.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusNotModified {
		t.Fatalf("expected status 304, got %d", rec2.Code)
	}
}

func TestListProxyListPublic_NoProxyStore(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := &Handler{
		cfg:        config.Config{},
		proxyStore: nil,
	}

	router := gin.New()
	router.GET("/api/proxies", h.ListProxyListPublic)

	req := httptest.NewRequest(http.MethodGet, "/api/proxies", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rec.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &response)

	if response["code"] != "PROXYLIST_UNAVAILABLE" {
		t.Errorf("expected error code PROXYLIST_UNAVAILABLE, got %v", response["code"])
	}
}

func TestListProxyListAuth_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{
		records: []store.ProxyListRecord{
			{IP: "192.168.1.1", Port: 8080, Host: "proxy1", LastSeen: time.Now()},
		},
		total: 1,
	}

	h := newTestHandler(mockStore, []string{"test-api-key-12345"})

	router := gin.New()
	router.GET("/api/v1/proxies", h.ListProxyListAuth)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/proxies", nil)
	req.Header.Set("Authorization", "Bearer test-api-key-12345")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestListProxyListAuth_MissingAPIKey(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{}
	h := newTestHandler(mockStore, []string{"test-api-key"})

	router := gin.New()
	router.GET("/api/v1/proxies", h.ListProxyListAuth)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/proxies", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rec.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &response)

	if response["code"] != "UNAUTHORIZED" {
		t.Errorf("expected error code UNAUTHORIZED, got %v", response["code"])
	}
}

func TestListProxyListAuth_InvalidAPIKey(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{}
	h := newTestHandler(mockStore, []string{"valid-api-key"})

	router := gin.New()
	router.GET("/api/v1/proxies", h.ListProxyListAuth)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/proxies", nil)
	req.Header.Set("Authorization", "Bearer invalid-api-key")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rec.Code)
	}
}

func TestListProxyListAuth_EmptyBearer(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{}
	h := newTestHandler(mockStore, []string{"valid-api-key"})

	router := gin.New()
	router.GET("/api/v1/proxies", h.ListProxyListAuth)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/proxies", nil)
	req.Header.Set("Authorization", "Bearer ")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rec.Code)
	}
}

func TestListProxyListAuth_NoAPIKeysConfigured(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{}
	h := newTestHandler(mockStore, []string{})

	router := gin.New()
	router.GET("/api/v1/proxies", h.ListProxyListAuth)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/proxies", nil)
	req.Header.Set("Authorization", "Bearer some-key")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rec.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &response)

	if response["code"] != "API_KEYS_NOT_CONFIGURED" {
		t.Errorf("expected error code API_KEYS_NOT_CONFIGURED, got %v", response["code"])
	}
}

func TestListProxyFacets_Countries(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{
		facets: []store.FacetRecord{
			{Type: "country", Key: "US", Count: 100, AvgDelay: 150},
			{Type: "country", Key: "DE", Count: 50, AvgDelay: 200},
		},
	}

	h := newTestHandler(mockStore, nil)

	router := gin.New()
	router.GET("/api/facets/countries", h.ListProxyFacetsCountries)

	req := httptest.NewRequest(http.MethodGet, "/api/facets/countries", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &response)

	data, ok := response["data"].([]interface{})
	if !ok {
		t.Fatal("expected data array in response")
	}
	if len(data) != 2 {
		t.Errorf("expected 2 facets, got %d", len(data))
	}
}

func TestListProxyFacets_Ports(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{
		facets: []store.FacetRecord{
			{Type: "port", Key: "8080", Count: 100},
			{Type: "port", Key: "3128", Count: 50},
		},
	}

	h := newTestHandler(mockStore, nil)

	router := gin.New()
	router.GET("/api/facets/ports", h.ListProxyFacetsPorts)

	req := httptest.NewRequest(http.MethodGet, "/api/facets/ports", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}

func TestListProxyFacets_Protocols(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{
		facets: []store.FacetRecord{
			{Type: "protocol", Key: "http", Count: 100},
			{Type: "protocol", Key: "socks5", Count: 50},
		},
	}

	h := newTestHandler(mockStore, nil)

	router := gin.New()
	router.GET("/api/facets/protocols", h.ListProxyFacetsProtocols)

	req := httptest.NewRequest(http.MethodGet, "/api/facets/protocols", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}

func TestListProxyFacets_NoProxyStore(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := &Handler{
		cfg:        config.Config{},
		proxyStore: nil,
	}

	router := gin.New()
	router.GET("/api/facets/countries", h.ListProxyFacetsCountries)

	req := httptest.NewRequest(http.MethodGet, "/api/facets/countries", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rec.Code)
	}
}

func TestExportProxyList_Text(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{
		records: []store.ProxyListRecord{
			{
				IP:       "203.0.113.10",
				Port:     1080,
				Host:     "proxy.example",
				HTTP:     1,
				Socks5:   1,
				ChecksUp: 5,
			},
		},
		total: 1,
	}

	h := newTestHandler(mockStore, nil)
	router := gin.New()
	router.GET("/api/proxies/export/:format", h.ExportProxyList)

	req := httptest.NewRequest(http.MethodGet, "/api/proxies/export/txt", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "203.0.113.10:1080") {
		t.Fatalf("expected exported list to include proxy address")
	}
}

func TestExportProxyList_StreamCSV(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{
		records: []store.ProxyListRecord{
			{IP: "203.0.113.10", Port: 1080, Host: "proxy.example"},
			{IP: "203.0.113.11", Port: 1081, Host: "proxy.example"},
		},
		total: 2,
	}

	h := newTestHandler(mockStore, nil)
	router := gin.New()
	router.GET("/api/proxies/export/:format", h.ExportProxyList)

	req := httptest.NewRequest(http.MethodGet, "/api/proxies/export/csv?stream=1&limit=2&page_size=1", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "ip,port,country_code") {
		t.Fatalf("expected csv header in response")
	}
	if !strings.Contains(body, "203.0.113.10") {
		t.Fatalf("expected first proxy in response")
	}
}

func TestExportProxyList_AsyncJob(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{
		records: []store.ProxyListRecord{
			{IP: "203.0.113.10", Port: 1080, Host: "proxy.example"},
		},
		total: 1,
	}

	cfg := config.Config{
		ExportDir:    t.TempDir(),
		ExportJobTTL: time.Minute,
	}

	unifiedStore := &mockUnifiedStore{mockProxyListStore: mockStore}

	h := &Handler{
		cfg:                cfg,
		store:              unifiedStore,
		proxyStore:         mockStore,
		exportManager:      NewExportManager(cfg, mockStore, nil),
		apiLimit:           100,
		apiRateLimitWindow: time.Hour,
	}

	router := gin.New()
	router.POST("/api/proxies/export/jobs", h.CreateExportJob)
	router.GET("/api/proxies/export/jobs/:id", h.GetExportJob)
	router.GET("/api/proxies/export/jobs/:id/download", h.DownloadExportJob)

	payload := []byte(`{"format":"csv","limit":1,"page_size":1}`)
	req := httptest.NewRequest(http.MethodPost, "/api/proxies/export/jobs", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected status 202, got %d: %s", rec.Code, rec.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	data, ok := response["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected data object in response")
	}
	jobID, ok := data["id"].(string)
	if !ok || jobID == "" {
		t.Fatalf("expected job id in response")
	}

	var status string
	for i := 0; i < 50; i++ {
		statusReq := httptest.NewRequest(http.MethodGet, "/api/proxies/export/jobs/"+jobID, nil)
		statusRec := httptest.NewRecorder()
		router.ServeHTTP(statusRec, statusReq)
		if statusRec.Code != http.StatusOK {
			time.Sleep(20 * time.Millisecond)
			continue
		}

		var statusPayload map[string]any
		if err := json.Unmarshal(statusRec.Body.Bytes(), &statusPayload); err != nil {
			time.Sleep(20 * time.Millisecond)
			continue
		}
		jobData, ok := statusPayload["data"].(map[string]any)
		if !ok {
			time.Sleep(20 * time.Millisecond)
			continue
		}
		status, _ = jobData["status"].(string)
		if status == string(exportJobCompleted) || status == string(exportJobFailed) {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}

	if status != string(exportJobCompleted) {
		t.Fatalf("expected job completed, got %s", status)
	}

	downloadReq := httptest.NewRequest(http.MethodGet, "/api/proxies/export/jobs/"+jobID+"/download", nil)
	downloadRec := httptest.NewRecorder()
	router.ServeHTTP(downloadRec, downloadReq)
	if downloadRec.Code != http.StatusOK {
		t.Fatalf("expected download status 200, got %d", downloadRec.Code)
	}
	if !strings.Contains(downloadRec.Body.String(), "ip,port") {
		t.Fatalf("expected csv download content")
	}
}

func TestGetASNDetails_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{}
	h := newTestHandler(mockStore, nil)

	router := gin.New()
	router.GET("/api/asn/:asn", h.GetASNDetails)

	req := httptest.NewRequest(http.MethodGet, "/api/asn/12345", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &response)

	data, ok := response["data"].(map[string]interface{})
	if !ok {
		t.Fatal("expected data object in response")
	}
	if data["asn"].(float64) != 12345 {
		t.Errorf("expected ASN 12345, got %v", data["asn"])
	}
}

func TestGetASNDetails_InvalidASN(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockProxyListStore{}
	h := newTestHandler(mockStore, nil)

	router := gin.New()
	router.GET("/api/asn/:asn", h.GetASNDetails)

	testCases := []struct {
		name string
		asn  string
	}{
		{"zero", "0"},
		{"negative", "-1"},
		{"text", "abc"},
		{"empty", ""},
	}

	for _, tc := range testCases {
		req := httptest.NewRequest(http.MethodGet, "/api/asn/"+tc.asn, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest && rec.Code != http.StatusNotFound {
			t.Errorf("%s: expected status 400 or 404, got %d", tc.name, rec.Code)
		}
	}
}

func TestGetASNDetails_NoProxyStore(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := &Handler{
		cfg:        config.Config{},
		proxyStore: nil,
	}

	router := gin.New()
	router.GET("/api/asn/:asn", h.GetASNDetails)

	req := httptest.NewRequest(http.MethodGet, "/api/asn/12345", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rec.Code)
	}
}

func TestSanitizeCountry(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"us", "US"},
		{"US", "US"},
		{"  us  ", "US"},
		{"usa", ""},
		{"u", ""},
		{"", ""},
	}

	for _, tc := range cases {
		result := sanitizeCountry(tc.input)
		if result != tc.expected {
			t.Errorf("sanitizeCountry(%q) = %q, expected %q", tc.input, result, tc.expected)
		}
	}
}

func TestSanitizeProtocol(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"http", "http"},
		{"HTTP", "http"},
		{"https", "https"},
		{"socks4", "socks4"},
		{"socks5", "socks5"},
		{"  SOCKS5  ", "socks5"},
		{"invalid", ""},
		{"", ""},
	}

	for _, tc := range cases {
		result := sanitizeProtocol(tc.input)
		if result != tc.expected {
			t.Errorf("sanitizeProtocol(%q) = %q, expected %q", tc.input, result, tc.expected)
		}
	}
}

func TestSanitizeAnonymity(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"elite", "elite"},
		{"ELITE", "elite"},
		{"anonymous", "anonymous"},
		{"transparent", "transparent"},
		{"  Elite  ", "elite"},
		{"invalid", ""},
		{"", ""},
	}

	for _, tc := range cases {
		result := sanitizeAnonymity(tc.input)
		if result != tc.expected {
			t.Errorf("sanitizeAnonymity(%q) = %q, expected %q", tc.input, result, tc.expected)
		}
	}
}

func TestSanitizeLabel(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"New York", "New York"},
		{"  Los Angeles  ", "Los Angeles"},
		{"Berlin-Mitte", "Berlin-Mitte"},
		{"St. John's", "St. John's"},
		{"<script>alert(1)</script>", "scriptalert1script"},
		{"City; DROP TABLE", "City DROP TABLE"},
		{"", ""},
	}

	for _, tc := range cases {
		result := sanitizeLabel(tc.input)
		if result != tc.expected {
			t.Errorf("sanitizeLabel(%q) = %q, expected %q", tc.input, result, tc.expected)
		}
	}
}

func TestSanitizeLabel_MaxLength(t *testing.T) {
	longInput := ""
	for i := 0; i < 100; i++ {
		longInput += "a"
	}

	result := sanitizeLabel(longInput)
	if len(result) > 64 {
		t.Errorf("expected max 64 chars, got %d", len(result))
	}
}

func TestParsePort(t *testing.T) {
	cases := []struct {
		input    string
		expected int
	}{
		{"8080", 8080},
		{"  3128  ", 3128},
		{"1", 1},
		{"65535", 65535},
		{"0", 0},
		{"65536", 0},
		{"-1", 0},
		{"abc", 0},
		{"", 0},
	}

	for _, tc := range cases {
		result := parsePort(tc.input)
		if result != tc.expected {
			t.Errorf("parsePort(%q) = %d, expected %d", tc.input, result, tc.expected)
		}
	}
}

func TestParseOffset(t *testing.T) {
	cases := []struct {
		input    string
		expected int
	}{
		{"0", 0},
		{"100", 100},
		{"  50  ", 50},
		{"-1", 0},
		{"abc", 0},
		{"", 0},
		{"100001", 100000},
	}

	for _, tc := range cases {
		result := parseOffset(tc.input)
		if result != tc.expected {
			t.Errorf("parseOffset(%q) = %d, expected %d", tc.input, result, tc.expected)
		}
	}
}

func TestParseASN(t *testing.T) {
	cases := []struct {
		input    string
		expected int
	}{
		{"12345", 12345},
		{"  67890  ", 67890},
		{"0", 0},
		{"-1", 0},
		{"abc", 0},
		{"", 0},
	}

	for _, tc := range cases {
		result := parseASN(tc.input)
		if result != tc.expected {
			t.Errorf("parseASN(%q) = %d, expected %d", tc.input, result, tc.expected)
		}
	}
}

func TestBuildProxyCacheKey(t *testing.T) {
	filters := store.ProxyListFilters{
		CountryCode: "US",
		Protocol:    "socks5",
		Limit:       25,
	}

	version := "123"
	webKey := buildProxyCacheKey(filters, false, version)
	if webKey == "" {
		t.Error("expected non-empty cache key")
	}
	expectedWebPrefix := "proxylist:v:" + version + ":list:web:"
	if !strings.HasPrefix(webKey, expectedWebPrefix) {
		t.Errorf("expected web prefix %q, got %q", expectedWebPrefix, webKey)
	}

	apiKey := buildProxyCacheKey(filters, true, version)
	expectedApiPrefix := "proxylist:v:" + version + ":list:api:"
	if !strings.HasPrefix(apiKey, expectedApiPrefix) {
		t.Errorf("expected api prefix %q, got %q", expectedApiPrefix, apiKey)
	}

	if webKey == apiKey {
		t.Error("expected different keys for web and api")
	}
}

func TestTransformProxyRecord(t *testing.T) {
	record := store.ProxyListRecord{
		Host:        "proxy.example.com",
		IP:          "192.168.1.1",
		Port:        8080,
		Delay:       100,
		CountryCode: "US",
		CountryName: "United States",
		HTTP:        1,
		SSL:         1,
		Socks5:      1,
		Anon:        4,
		ChecksUp:    90,
		ChecksDown:  10,
		LastSeen:    time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
	}

	item := transformProxyRecord(record)

	if item.Host != "proxy.example.com" {
		t.Errorf("expected host proxy.example.com, got %s", item.Host)
	}
	if item.IP != "192.168.1.1" {
		t.Errorf("expected IP 192.168.1.1, got %s", item.IP)
	}
	if item.Port != 8080 {
		t.Errorf("expected port 8080, got %d", item.Port)
	}
	if len(item.Protocols) != 3 {
		t.Errorf("expected 3 protocols, got %d", len(item.Protocols))
	}
	if item.AnonymityLevel != "Elite" {
		t.Errorf("expected Elite anonymity, got %s", item.AnonymityLevel)
	}
	if item.Uptime != 90 {
		t.Errorf("expected 90%% uptime, got %d", item.Uptime)
	}
	if item.LastSeen != "2024-01-01T12:00:00Z" {
		t.Errorf("expected 2024-01-01T12:00:00Z, got %s", item.LastSeen)
	}
}

func TestTransformProxyRecord_AnonymityLevels(t *testing.T) {
	cases := []struct {
		anon     int
		expected string
	}{
		{0, "Transparent"},
		{1, "Transparent"},
		{2, "Anonymous"},
		{3, "Anonymous"},
		{4, "Elite"},
		{5, "Elite"},
		{6, "Unknown"},
	}

	for _, tc := range cases {
		record := store.ProxyListRecord{IP: "192.168.1.1", Port: 8080, Anon: tc.anon}
		item := transformProxyRecord(record)
		if item.AnonymityLevel != tc.expected {
			t.Errorf("anon %d: expected %s, got %s", tc.anon, tc.expected, item.AnonymityLevel)
		}
	}
}

func TestTransformProxyRecord_ZeroChecks(t *testing.T) {
	record := store.ProxyListRecord{
		IP:         "192.168.1.1",
		Port:       8080,
		ChecksUp:   0,
		ChecksDown: 0,
	}

	item := transformProxyRecord(record)
	if item.Uptime != 0 {
		t.Errorf("expected 0%% uptime for zero checks, got %d", item.Uptime)
	}
}

func TestTransformProxyRecord_ZeroLastSeen(t *testing.T) {
	record := store.ProxyListRecord{
		IP:   "192.168.1.1",
		Port: 8080,
	}

	item := transformProxyRecord(record)
	if item.LastSeen != "" {
		t.Errorf("expected empty last_seen for zero time, got %s", item.LastSeen)
	}
}

func TestRateWindowReset(t *testing.T) {
	reset := rateWindowReset(time.Hour)
	now := time.Now().UTC()

	if reset <= now.Unix() {
		t.Error("reset time should be in the future")
	}
	if reset > now.Add(time.Hour).Unix() {
		t.Error("reset time should be within one hour")
	}
}

func TestRateWindowReset_ZeroDuration(t *testing.T) {
	reset := rateWindowReset(0)
	if reset != 0 {
		t.Errorf("expected 0 for zero duration, got %d", reset)
	}
}
