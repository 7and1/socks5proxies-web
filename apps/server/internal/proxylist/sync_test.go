package proxylist

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"socksproxies.com/server/internal/store"
)

type mockProxyListStore struct {
	upsertCount  int
	upsertErr    error
	rebuildErr   error
	rebuildCalls int
}

func (m *mockProxyListStore) UpsertProxyListBatch(ctx context.Context, records []store.ProxyListRecord) (int, error) {
	if m.upsertErr != nil {
		return 0, m.upsertErr
	}
	m.upsertCount += len(records)
	return len(records), nil
}

func (m *mockProxyListStore) DeleteStaleProxies(ctx context.Context, cutoff time.Time) (int, error) {
	if m.upsertErr != nil {
		return 0, m.upsertErr
	}
	return 0, nil
}

func (m *mockProxyListStore) ListProxyList(ctx context.Context, filters store.ProxyListFilters) ([]store.ProxyListRecord, int, error) {
	return nil, 0, nil
}

func (m *mockProxyListStore) ListRecentProxies(ctx context.Context, limit int) ([]store.ProxyListRecord, error) {
	return nil, nil
}

func (m *mockProxyListStore) ListRandomProxies(ctx context.Context, limit int) ([]store.ProxyListRecord, error) {
	return nil, nil
}

func (m *mockProxyListStore) ListProxyFacets(ctx context.Context, facetType string, limit, offset int) ([]store.FacetRecord, error) {
	return nil, nil
}

func (m *mockProxyListStore) CountProxyFacets(ctx context.Context, facetType string) (int, error) {
	return 0, nil
}

func (m *mockProxyListStore) GetASNDetails(ctx context.Context, asn int) (store.ASNDetails, error) {
	return store.ASNDetails{}, nil
}

func (m *mockProxyListStore) GetProxyStats(ctx context.Context) (store.ProxyStats, error) {
	return store.ProxyStats{}, nil
}

func (m *mockProxyListStore) RebuildProxyFacets(ctx context.Context) error {
	m.rebuildCalls++
	return m.rebuildErr
}

type mockGeoReader struct {
	cityInfo store.ProxyListRecord
	asnInfo  store.ProxyListRecord
}

func TestNewSyncer_Defaults(t *testing.T) {
	config := SyncConfig{
		SourceURL: "http://example.com/proxies.csv",
	}
	mockStore := &mockProxyListStore{}

	syncer := NewSyncer(config, mockStore, nil, nil)

	if syncer == nil {
		t.Fatal("expected syncer to be created")
	}
	if syncer.config.SyncInterval != 5*time.Minute {
		t.Errorf("expected default sync interval 5m, got %v", syncer.config.SyncInterval)
	}
	if syncer.client.Timeout != 30*time.Second {
		t.Errorf("expected default timeout 30s, got %v", syncer.client.Timeout)
	}
}

func TestNewSyncer_CustomConfig(t *testing.T) {
	config := SyncConfig{
		SourceURL:      "http://example.com/proxies.csv",
		SyncInterval:   10 * time.Minute,
		RequestTimeout: 60 * time.Second,
	}
	mockStore := &mockProxyListStore{}

	syncer := NewSyncer(config, mockStore, nil, nil)

	if syncer.config.SyncInterval != 10*time.Minute {
		t.Errorf("expected sync interval 10m, got %v", syncer.config.SyncInterval)
	}
	if syncer.client.Timeout != 60*time.Second {
		t.Errorf("expected timeout 60s, got %v", syncer.client.Timeout)
	}
}

func TestSyncer_Start_NilStore(t *testing.T) {
	config := SyncConfig{
		SourceURL: "http://example.com/proxies.csv",
	}
	syncer := NewSyncer(config, nil, nil, nil)

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	syncer.Start(ctx)
}

func TestSyncer_Start_EmptySourceURL(t *testing.T) {
	config := SyncConfig{
		SourceURL: "",
	}
	mockStore := &mockProxyListStore{}
	syncer := NewSyncer(config, mockStore, nil, nil)

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	syncer.Start(ctx)
}

func TestSyncer_Start_NilSyncer(t *testing.T) {
	var syncer *Syncer

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	syncer.Start(ctx)
}

func TestSyncer_Sync_Success(t *testing.T) {
	csvData := `ip;port;country_code
192.168.1.1;8080;US
192.168.1.2;3128;DE
192.168.1.3;1080;JP`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("User-Agent") != "Socks5Proxies/1.0 (+https://socks5proxies.com)" {
			t.Errorf("unexpected User-Agent: %s", r.Header.Get("User-Agent"))
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(csvData))
	}))
	defer server.Close()

	mockStore := &mockProxyListStore{}
	config := SyncConfig{
		SourceURL:      server.URL,
		RequestTimeout: 5 * time.Second,
	}
	syncer := NewSyncer(config, mockStore, nil, nil)

	err := syncer.sync(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if mockStore.upsertCount != 3 {
		t.Errorf("expected 3 upserted records, got %d", mockStore.upsertCount)
	}
	if mockStore.rebuildCalls != 1 {
		t.Errorf("expected 1 rebuild call, got %d", mockStore.rebuildCalls)
	}
}

func TestSyncer_Sync_HTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	mockStore := &mockProxyListStore{}
	config := SyncConfig{
		SourceURL:      server.URL,
		RequestTimeout: 5 * time.Second,
	}
	syncer := NewSyncer(config, mockStore, nil, nil)

	err := syncer.sync(context.Background())
	if err == nil {
		t.Fatal("expected error for HTTP 500")
	}
}

func TestSyncer_Sync_HTTP404(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	mockStore := &mockProxyListStore{}
	config := SyncConfig{
		SourceURL:      server.URL,
		RequestTimeout: 5 * time.Second,
	}
	syncer := NewSyncer(config, mockStore, nil, nil)

	err := syncer.sync(context.Background())
	if err == nil {
		t.Fatal("expected error for HTTP 404")
	}
}

func TestSyncer_Sync_NetworkError(t *testing.T) {
	mockStore := &mockProxyListStore{}
	config := SyncConfig{
		SourceURL:      "http://invalid.invalid.invalid:12345/proxies.csv",
		RequestTimeout: 1 * time.Second,
	}
	syncer := NewSyncer(config, mockStore, nil, nil)

	err := syncer.sync(context.Background())
	if err == nil {
		t.Fatal("expected network error")
	}
}

func TestSyncer_Sync_UpsertError(t *testing.T) {
	csvData := `ip;port;country_code
192.168.1.1;8080;US`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(csvData))
	}))
	defer server.Close()

	mockStore := &mockProxyListStore{
		upsertErr: errors.New("database error"),
	}
	config := SyncConfig{
		SourceURL:      server.URL,
		RequestTimeout: 5 * time.Second,
	}
	syncer := NewSyncer(config, mockStore, nil, nil)

	err := syncer.sync(context.Background())
	if err == nil {
		t.Fatal("expected upsert error")
	}
}

func TestSyncer_Sync_RebuildError(t *testing.T) {
	csvData := `ip;port;country_code
192.168.1.1;8080;US`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(csvData))
	}))
	defer server.Close()

	mockStore := &mockProxyListStore{
		rebuildErr: errors.New("rebuild failed"),
	}
	config := SyncConfig{
		SourceURL:      server.URL,
		RequestTimeout: 5 * time.Second,
	}
	syncer := NewSyncer(config, mockStore, nil, nil)

	err := syncer.sync(context.Background())
	if err == nil {
		t.Fatal("expected rebuild error")
	}
}

func TestSyncer_Sync_ContextCanceled(t *testing.T) {
	var requestCount int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requestCount, 1)
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	mockStore := &mockProxyListStore{}
	config := SyncConfig{
		SourceURL:      server.URL,
		RequestTimeout: 10 * time.Second,
	}
	syncer := NewSyncer(config, mockStore, nil, nil)

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	err := syncer.sync(ctx)
	if err == nil {
		t.Fatal("expected context canceled error")
	}
}

func TestSyncer_Sync_EmptyCSV(t *testing.T) {
	csvData := `ip;port;country_code`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(csvData))
	}))
	defer server.Close()

	mockStore := &mockProxyListStore{}
	config := SyncConfig{
		SourceURL:      server.URL,
		RequestTimeout: 5 * time.Second,
	}
	syncer := NewSyncer(config, mockStore, nil, nil)

	err := syncer.sync(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if mockStore.upsertCount != 0 {
		t.Errorf("expected 0 upserted records, got %d", mockStore.upsertCount)
	}
}

func TestSyncer_EnrichRecords_NilGeo(t *testing.T) {
	syncer := &Syncer{geo: nil}

	records := []store.ProxyListRecord{
		{IP: "192.168.1.1", Port: 8080},
	}

	enriched := syncer.enrichRecords(records)

	if len(enriched) != 1 {
		t.Fatalf("expected 1 record, got %d", len(enriched))
	}
	if enriched[0].CountryCode != "" {
		t.Errorf("expected empty country code with nil geo, got %s", enriched[0].CountryCode)
	}
}

func TestSyncer_EnrichRecords_EmptyIP(t *testing.T) {
	syncer := &Syncer{geo: nil}

	records := []store.ProxyListRecord{
		{IP: "", Port: 8080},
	}

	enriched := syncer.enrichRecords(records)

	if len(enriched) != 1 {
		t.Fatalf("expected 1 record, got %d", len(enriched))
	}
}

func TestSyncer_EnrichRecords_PrefilledData(t *testing.T) {
	syncer := &Syncer{geo: nil}

	records := []store.ProxyListRecord{
		{
			IP:            "192.168.1.1",
			Port:          8080,
			CountryCode:   "US",
			CountryName:   "United States",
			City:          "New York",
			Region:        "NY",
			ContinentCode: "NA",
			ASN:           12345,
			ASNName:       "Example ISP",
			Org:           "Example Org",
		},
	}

	enriched := syncer.enrichRecords(records)

	if enriched[0].CountryCode != "US" {
		t.Errorf("expected preserved country code US, got %s", enriched[0].CountryCode)
	}
	if enriched[0].ASN != 12345 {
		t.Errorf("expected preserved ASN 12345, got %d", enriched[0].ASN)
	}
}

func TestSyncer_FetchCSV_Success(t *testing.T) {
	csvData := `ip;port;country_code
192.168.1.1;8080;US`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Errorf("expected GET method, got %s", r.Method)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(csvData))
	}))
	defer server.Close()

	mockStore := &mockProxyListStore{}
	config := SyncConfig{
		SourceURL:      server.URL,
		RequestTimeout: 5 * time.Second,
	}
	syncer := NewSyncer(config, mockStore, nil, nil)

	reader, err := syncer.fetchCSV(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer reader.Close()
}

func TestSyncer_FetchCSV_Redirect(t *testing.T) {
	csvData := `ip;port;country_code
192.168.1.1;8080;US`

	finalServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(csvData))
	}))
	defer finalServer.Close()

	redirectServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, finalServer.URL, http.StatusTemporaryRedirect)
	}))
	defer redirectServer.Close()

	mockStore := &mockProxyListStore{}
	config := SyncConfig{
		SourceURL:      redirectServer.URL,
		RequestTimeout: 5 * time.Second,
	}
	syncer := NewSyncer(config, mockStore, nil, nil)

	reader, err := syncer.fetchCSV(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer reader.Close()
}

func TestSyncer_Start_PeriodicSync(t *testing.T) {
	var syncCount int32
	csvData := `ip;port;country_code
192.168.1.1;8080;US`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&syncCount, 1)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(csvData))
	}))
	defer server.Close()

	mockStore := &mockProxyListStore{}
	config := SyncConfig{
		SourceURL:      server.URL,
		SyncInterval:   50 * time.Millisecond,
		RequestTimeout: 5 * time.Second,
	}
	syncer := NewSyncer(config, mockStore, nil, nil)

	ctx, cancel := context.WithTimeout(context.Background(), 180*time.Millisecond)
	defer cancel()

	go syncer.Start(ctx)
	<-ctx.Done()

	time.Sleep(20 * time.Millisecond)

	count := atomic.LoadInt32(&syncCount)
	if count < 2 {
		t.Errorf("expected at least 2 syncs (initial + periodic), got %d", count)
	}
}
