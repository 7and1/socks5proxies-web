package store

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

// BackendType represents the database backend type
type BackendType string

const (
	BackendPostgres BackendType = "postgres"
	BackendSQLite   BackendType = "sqlite"
)

// Storer is the interface for database operations
type Storer interface {
	UpsertProxy(ctx context.Context, record ProxyRecord) (int64, error)
	InsertCheck(ctx context.Context, record CheckRecord) error
	ListProxies(ctx context.Context, limit int) ([]ProxyRecord, error)
	CountProxies(ctx context.Context) (int, error)
}

// UnifiedStore wraps either SQLite or PostgreSQL backend
type UnifiedStore struct {
	backend  BackendType
	sqlite   *Store
	postgres *PostgresStore
}

// Ensure UnifiedStore implements Storer
var _ Storer = (*UnifiedStore)(nil)

type Store struct {
	DB *sqlx.DB
}

type ProxyRecord struct {
	ID          int64     `db:"id"`
	Address     string    `db:"address"`
	Protocol    string    `db:"protocol"`
	Country     string    `db:"country"`
	Anonymity   string    `db:"anonymity"`
	LastStatus  bool      `db:"last_status"`
	LastLatency int64     `db:"last_latency"`
	LastChecked time.Time `db:"last_checked"`
	CreatedAt   time.Time `db:"created_at"`
}

type CheckRecord struct {
	ID        int64     `db:"id"`
	ProxyID   int64     `db:"proxy_id"`
	Address   string    `db:"address"`  // Optional: for PostgreSQL foreign key lookup
	Protocol  string    `db:"protocol"` // Optional: for PostgreSQL foreign key lookup
	Status    bool      `db:"status"`
	Latency   int64     `db:"latency"`
	CheckedAt time.Time `db:"checked_at"`
	IP        string    `db:"ip"`
	Country   string    `db:"country"`
	Anonymity string    `db:"anonymity"`
}

func Open(path string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}

	db, err := sqlx.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	db.SetConnMaxLifetime(2 * time.Minute)

	if err := migrate(db); err != nil {
		return nil, err
	}

	return &Store{DB: db}, nil
}

func (s *Store) UpsertProxy(ctx context.Context, record ProxyRecord) (int64, error) {
	if record.CreatedAt.IsZero() {
		record.CreatedAt = time.Now().UTC()
	}
	if record.LastChecked.IsZero() {
		record.LastChecked = time.Now().UTC()
	}

	result, err := s.DB.ExecContext(ctx, `
		INSERT INTO proxies (address, protocol, country, anonymity, last_status, last_latency, last_checked, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(address, protocol) DO UPDATE SET
			country = excluded.country,
			anonymity = excluded.anonymity,
			last_status = excluded.last_status,
			last_latency = excluded.last_latency,
			last_checked = excluded.last_checked
	`, record.Address, record.Protocol, record.Country, record.Anonymity, record.LastStatus, record.LastLatency, record.LastChecked, record.CreatedAt)
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	if err == nil && id > 0 {
		return id, nil
	}

	var existingID int64
	if err := s.DB.GetContext(ctx, &existingID, "SELECT id FROM proxies WHERE address = ? AND protocol = ?", record.Address, record.Protocol); err != nil {
		return 0, err
	}
	return existingID, nil
}

func (s *Store) InsertCheck(ctx context.Context, record CheckRecord) error {
	if record.CheckedAt.IsZero() {
		record.CheckedAt = time.Now().UTC()
	}
	_, err := s.DB.ExecContext(ctx, `
		INSERT INTO checks (proxy_id, status, latency, checked_at, ip, country, anonymity)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, record.ProxyID, record.Status, record.Latency, record.CheckedAt, record.IP, record.Country, record.Anonymity)
	return err
}

func (s *Store) ListProxies(ctx context.Context, limit int) ([]ProxyRecord, error) {
	if limit <= 0 {
		limit = 50
	}
	var records []ProxyRecord
	query := `
		SELECT id, address, protocol, country, anonymity, last_status, last_latency, last_checked, created_at
		FROM proxies
		ORDER BY last_checked DESC
		LIMIT ?
	`
	if err := s.DB.SelectContext(ctx, &records, query, limit); err != nil {
		return nil, err
	}
	return records, nil
}

func (s *Store) CountProxies(ctx context.Context) (int, error) {
	var count int
	if err := s.DB.GetContext(ctx, &count, "SELECT COUNT(1) FROM proxies"); err != nil {
		return 0, err
	}
	return count, nil
}

func migrate(db *sqlx.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS proxies (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		address TEXT NOT NULL,
		protocol TEXT NOT NULL,
		country TEXT,
		anonymity TEXT,
		last_status BOOLEAN,
		last_latency INTEGER,
		last_checked DATETIME,
		created_at DATETIME,
		UNIQUE(address, protocol)
	);

	CREATE TABLE IF NOT EXISTS checks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		proxy_id INTEGER NOT NULL,
		status BOOLEAN,
		latency INTEGER,
		checked_at DATETIME,
		ip TEXT,
		country TEXT,
		anonymity TEXT,
		FOREIGN KEY(proxy_id) REFERENCES proxies(id)
	);

	CREATE INDEX IF NOT EXISTS idx_proxies_last_checked ON proxies(last_checked DESC);
	CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(last_status) WHERE last_status = 1;
	CREATE INDEX IF NOT EXISTS idx_checks_proxy_id ON checks(proxy_id);
	CREATE INDEX IF NOT EXISTS idx_checks_checked_at ON checks(checked_at DESC);

	CREATE TABLE IF NOT EXISTS proxy_list (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		host TEXT NOT NULL,
		ip TEXT NOT NULL,
		port INTEGER NOT NULL,
		last_seen DATETIME,
		delay INTEGER DEFAULT 0,
		cid TEXT,
		country_code TEXT,
		country_name TEXT,
		city TEXT,
		region TEXT,
		asn INTEGER,
		asn_name TEXT,
		org TEXT,
		continent_code TEXT,
		checks_up INTEGER DEFAULT 0,
		checks_down INTEGER DEFAULT 0,
		anon INTEGER DEFAULT 0,
		http INTEGER DEFAULT 0,
		ssl INTEGER DEFAULT 0,
		socks4 INTEGER DEFAULT 0,
		socks5 INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(ip, port)
	);

	CREATE INDEX IF NOT EXISTS idx_proxy_list_country ON proxy_list(country_code);
	CREATE INDEX IF NOT EXISTS idx_proxy_list_port ON proxy_list(port);
	CREATE INDEX IF NOT EXISTS idx_proxy_list_protocol ON proxy_list(http, ssl, socks4, socks5);
	CREATE INDEX IF NOT EXISTS idx_proxy_list_anon ON proxy_list(anon);
	CREATE INDEX IF NOT EXISTS idx_proxy_list_delay ON proxy_list(delay);
	CREATE INDEX IF NOT EXISTS idx_proxy_list_last_seen ON proxy_list(last_seen DESC);
	CREATE INDEX IF NOT EXISTS idx_proxy_list_city ON proxy_list(city);
	CREATE INDEX IF NOT EXISTS idx_proxy_list_region ON proxy_list(region);
	CREATE INDEX IF NOT EXISTS idx_proxy_list_asn ON proxy_list(asn);
	CREATE INDEX IF NOT EXISTS idx_proxy_list_protocol_country ON proxy_list(socks5, country_code, last_seen DESC);
	CREATE INDEX IF NOT EXISTS idx_proxy_list_country_port ON proxy_list(country_code, port, last_seen DESC);
	CREATE INDEX IF NOT EXISTS idx_proxy_list_asn_country ON proxy_list(asn, country_code);

	CREATE TABLE IF NOT EXISTS facets (
		type TEXT NOT NULL,
		key TEXT NOT NULL,
		count INTEGER DEFAULT 0,
		avg_delay REAL DEFAULT 0,
		metadata TEXT,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (type, key)
	);
	`

	if _, err := db.Exec(schema); err != nil {
		return fmt.Errorf("migrate schema: %w", err)
	}

	// Performance: Enable WAL mode for better concurrent read/write
	_, err := db.Exec("PRAGMA journal_mode=WAL;")
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	// Performance: Additional SQLite optimizations
	pragmas := []string{
		"PRAGMA synchronous=NORMAL;",
		"PRAGMA cache_size=-64000;", // 64MB cache
		"PRAGMA temp_store=MEMORY;",
		"PRAGMA mmap_size=268435456;", // 256MB memory-mapped I/O
		"PRAGMA page_size=4096;",
	}
	for _, pragma := range pragmas {
		_, _ = db.Exec(pragma)
	}

	return nil
}

// OpenStore creates a store based on configuration
// Prefers PostgreSQL if DATABASE_URL is provided, otherwise falls back to SQLite
func OpenStore(databaseURL, databaseSchema, sqlitePath string) (*UnifiedStore, error) {
	if databaseURL != "" {
		pgStore, err := OpenPostgres(databaseURL, databaseSchema)
		if err != nil {
			return nil, fmt.Errorf("open postgres: %w", err)
		}
		return &UnifiedStore{
			backend:  BackendPostgres,
			postgres: pgStore,
		}, nil
	}

	sqliteStore, err := Open(sqlitePath)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	return &UnifiedStore{
		backend: BackendSQLite,
		sqlite:  sqliteStore,
	}, nil
}

// Backend returns the active backend type
func (s *UnifiedStore) Backend() BackendType {
	return s.backend
}

// Close closes the underlying database connection
func (s *UnifiedStore) Close() error {
	if s.postgres != nil {
		s.postgres.Close()
	}
	if s.sqlite != nil && s.sqlite.DB != nil {
		return s.sqlite.DB.Close()
	}
	return nil
}

// UpsertProxy forwards to the appropriate backend
func (s *UnifiedStore) UpsertProxy(ctx context.Context, record ProxyRecord) (int64, error) {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.UpsertProxy(ctx, record)
	default:
		return s.sqlite.UpsertProxy(ctx, record)
	}
}

// InsertCheck forwards to the appropriate backend
func (s *UnifiedStore) InsertCheck(ctx context.Context, record CheckRecord) error {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.InsertCheck(ctx, record)
	default:
		return s.sqlite.InsertCheck(ctx, record)
	}
}

// ListProxies forwards to the appropriate backend
func (s *UnifiedStore) ListProxies(ctx context.Context, limit int) ([]ProxyRecord, error) {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.ListProxies(ctx, limit)
	default:
		return s.sqlite.ListProxies(ctx, limit)
	}
}

// CountProxies forwards to the appropriate backend
func (s *UnifiedStore) CountProxies(ctx context.Context) (int, error) {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.CountProxies(ctx)
	default:
		return s.sqlite.CountProxies(ctx)
	}
}

// UpsertProxyListBatch forwards to the appropriate backend
func (s *UnifiedStore) UpsertProxyListBatch(ctx context.Context, records []ProxyListRecord) (int, error) {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.UpsertProxyListBatch(ctx, records)
	default:
		return s.sqlite.UpsertProxyListBatch(ctx, records)
	}
}

// ListProxyList forwards to the appropriate backend
func (s *UnifiedStore) ListProxyList(ctx context.Context, filters ProxyListFilters) ([]ProxyListRecord, int, error) {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.ListProxyList(ctx, filters)
	default:
		return s.sqlite.ListProxyList(ctx, filters)
	}
}

func (s *UnifiedStore) ListRecentProxies(ctx context.Context, limit int) ([]ProxyListRecord, error) {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.ListRecentProxies(ctx, limit)
	default:
		return s.sqlite.ListRecentProxies(ctx, limit)
	}
}

func (s *UnifiedStore) ListRandomProxies(ctx context.Context, limit int) ([]ProxyListRecord, error) {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.ListRandomProxies(ctx, limit)
	default:
		return s.sqlite.ListRandomProxies(ctx, limit)
	}
}

// ListProxyFacets forwards to the appropriate backend
func (s *UnifiedStore) ListProxyFacets(ctx context.Context, facetType string, limit, offset int) ([]FacetRecord, error) {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.ListProxyFacets(ctx, facetType, limit, offset)
	default:
		return s.sqlite.ListProxyFacets(ctx, facetType, limit, offset)
	}
}

// RebuildProxyFacets forwards to the appropriate backend
func (s *UnifiedStore) RebuildProxyFacets(ctx context.Context) error {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.RebuildProxyFacets(ctx)
	default:
		return s.sqlite.RebuildProxyFacets(ctx)
	}
}

func (s *UnifiedStore) CountProxyFacets(ctx context.Context, facetType string) (int, error) {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.CountProxyFacets(ctx, facetType)
	default:
		return s.sqlite.CountProxyFacets(ctx, facetType)
	}
}

func (s *UnifiedStore) GetASNDetails(ctx context.Context, asn int) (ASNDetails, error) {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.GetASNDetails(ctx, asn)
	default:
		return s.sqlite.GetASNDetails(ctx, asn)
	}
}

func (s *UnifiedStore) GetProxyStats(ctx context.Context) (ProxyStats, error) {
	switch s.backend {
	case BackendPostgres:
		return s.postgres.GetProxyStats(ctx)
	default:
		return s.sqlite.GetProxyStats(ctx)
	}
}
