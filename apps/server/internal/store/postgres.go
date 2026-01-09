package store

import (
	"context"
	"fmt"
	"regexp"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// schemaNamePattern validates schema names to prevent SQL injection
var schemaNamePattern = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)

// PostgresStore implements Store interface with PostgreSQL backend
type PostgresStore struct {
	DB      *pgxpool.Pool
	schema  string
}

// PostgresProxyRecord represents a proxy in PostgreSQL with UUID
type PostgresProxyRecord struct {
	ID          uuid.UUID `db:"id"`
	Address     string    `db:"address"`
	Protocol    string    `db:"protocol"`
	Country     *string   `db:"country"`
	Anonymity   *string   `db:"anonymity"`
	LastStatus  bool      `db:"last_status"`
	LastLatency *int      `db:"last_latency"`
	LastChecked *time.Time `db:"last_checked"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

// PostgresCheckRecord represents a check in PostgreSQL with UUID
type PostgresCheckRecord struct {
	ID        uuid.UUID  `db:"id"`
	ProxyID   uuid.UUID  `db:"proxy_id"`
	Status    bool       `db:"status"`
	Latency   *int       `db:"latency"`
	CheckedAt time.Time  `db:"checked_at"`
	IP        *string    `db:"ip"`
	Country   *string    `db:"country"`
	Anonymity *string    `db:"anonymity"`
}

// OpenPostgres creates a new PostgreSQL store with connection pooling
func OpenPostgres(databaseURL, schema string) (*PostgresStore, error) {
	// Validate schema name to prevent SQL injection
	if !schemaNamePattern.MatchString(schema) {
		return nil, fmt.Errorf("invalid schema name: %q - must contain only alphanumeric characters and underscores, and start with letter or underscore", schema)
	}

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	// Connection pool settings
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 2 * time.Hour
	config.MaxConnIdleTime = 5 * time.Minute
	config.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	// Verify connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &PostgresStore{
		DB:     pool,
		schema: schema,
	}, nil
}

// Schema returns the schema name for this store
func (s *PostgresStore) Schema() string {
	return s.schema
}

// Close closes the connection pool
func (s *PostgresStore) Close() {
	s.DB.Close()
}

// UpsertProxy inserts or updates a proxy record
func (s *PostgresStore) UpsertProxy(ctx context.Context, record ProxyRecord) (int64, error) {
	query := fmt.Sprintf(`
		INSERT INTO %s.proxies (address, protocol, country, anonymity, last_status, last_latency, last_checked, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (address, protocol) DO UPDATE SET
			country = EXCLUDED.country,
			anonymity = EXCLUDED.anonymity,
			last_status = EXCLUDED.last_status,
			last_latency = EXCLUDED.last_latency,
			last_checked = EXCLUDED.last_checked
		RETURNING id
	`, s.QuoteSchema())

	if record.CreatedAt.IsZero() {
		record.CreatedAt = time.Now().UTC()
	}
	if record.LastChecked.IsZero() {
		record.LastChecked = time.Now().UTC()
	}

	var country, anonymity *string
	if record.Country != "" {
		country = &record.Country
	}
	if record.Anonymity != "" {
		anonymity = &record.Anonymity
	}

	var latency *int
	if record.LastLatency > 0 {
		l := int(record.LastLatency)
		latency = &l
	}

	var lastChecked *time.Time
	if !record.LastChecked.IsZero() {
		lastChecked = &record.LastChecked
	}

	var id uuid.UUID
	err := s.DB.QueryRow(ctx, query,
		record.Address,
		record.Protocol,
		country,
		anonymity,
		record.LastStatus,
		latency,
		lastChecked,
		record.CreatedAt,
	).Scan(&id)

	if err != nil {
		return 0, fmt.Errorf("upsert proxy: %w", err)
	}

	// Return UUID hash as int64 for compatibility
	return hashUUIDToInt64(id), nil
}

// InsertCheck inserts a check record
func (s *PostgresStore) InsertCheck(ctx context.Context, record CheckRecord) error {
	// Use Address and Protocol to look up the proxy_id (UUID)
	// This is necessary because CheckRecord uses int64 ProxyID for SQLite compatibility
	query := fmt.Sprintf(`
		INSERT INTO %s.checks (proxy_id, status, latency, checked_at, ip, country, anonymity)
		SELECT id, $3, $4, $5, $6, $7, $8
		FROM %s.proxies
		WHERE address = $1 AND protocol = $2
		LIMIT 1
	`, s.QuoteSchema(), s.QuoteSchema())

	if record.CheckedAt.IsZero() {
		record.CheckedAt = time.Now().UTC()
	}

	var latency *int
	if record.Latency > 0 {
		l := int(record.Latency)
		latency = &l
	}

	var ip, country, anonymity *string
	if record.IP != "" {
		ip = &record.IP
	}
	if record.Country != "" {
		country = &record.Country
	}
	if record.Anonymity != "" {
		anonymity = &record.Anonymity
	}

	// Skip inserting if address/protocol not provided
	if record.Address == "" || record.Protocol == "" {
		return fmt.Errorf("address and protocol required for check record")
	}

	result, err := s.DB.Exec(ctx, query,
		record.Address,
		record.Protocol,
		record.Status,
		latency,
		record.CheckedAt,
		ip,
		country,
		anonymity,
	)

	if err != nil {
		return fmt.Errorf("insert check: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		// If no proxy found, that's okay - it might have been deleted
		// Just log and continue
		return nil
	}

	return nil
}

// ListProxies lists proxies ordered by last checked
func (s *PostgresStore) ListProxies(ctx context.Context, limit int) ([]ProxyRecord, error) {
	if limit <= 0 {
		limit = 50
	}

	query := fmt.Sprintf(`
		SELECT id, address, protocol, country, anonymity,
		       last_status, last_latency, last_checked, created_at
		FROM %s.proxies
		ORDER BY last_checked DESC NULLS LAST
		LIMIT $1
	`, s.QuoteSchema())

	rows, err := s.DB.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("query proxies: %w", err)
	}
	defer rows.Close()

	var records []ProxyRecord
	for rows.Next() {
		var pgRecord PostgresProxyRecord
		err := rows.Scan(
			&pgRecord.ID,
			&pgRecord.Address,
			&pgRecord.Protocol,
			&pgRecord.Country,
			&pgRecord.Anonymity,
			&pgRecord.LastStatus,
			&pgRecord.LastLatency,
			&pgRecord.LastChecked,
			&pgRecord.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan proxy: %w", err)
		}

		record := ProxyRecord{
			ID:         hashUUIDToInt64(pgRecord.ID),
			Address:    pgRecord.Address,
			Protocol:   pgRecord.Protocol,
			Country:    stringPtrToString(pgRecord.Country),
			Anonymity:  stringPtrToString(pgRecord.Anonymity),
			LastStatus: pgRecord.LastStatus,
			CreatedAt:  pgRecord.CreatedAt,
		}

		if pgRecord.LastLatency != nil {
			record.LastLatency = int64(*pgRecord.LastLatency)
		}
		if pgRecord.LastChecked != nil {
			record.LastChecked = *pgRecord.LastChecked
		}

		records = append(records, record)
	}

	return records, nil
}

// CountProxies returns the total number of proxies
func (s *PostgresStore) CountProxies(ctx context.Context) (int, error) {
	query := fmt.Sprintf("SELECT COUNT(*) FROM %s.proxies", s.QuoteSchema())

	var count int
	err := s.DB.QueryRow(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count proxies: %w", err)
	}

	return count, nil
}

// GetProxyByAddressProtocol retrieves a proxy by address and protocol
func (s *PostgresStore) GetProxyByAddressProtocol(ctx context.Context, address, protocol string) (uuid.UUID, error) {
	query := fmt.Sprintf(`
		SELECT id FROM %s.proxies
		WHERE address = $1 AND protocol = $2
	`, s.QuoteSchema())

	var id uuid.UUID
	err := s.DB.QueryRow(ctx, query, address, protocol).Scan(&id)
	if err != nil {
		return uuid.Nil, fmt.Errorf("get proxy id: %w", err)
	}

	return id, nil
}

// QuoteSchema returns a safely quoted schema identifier
func (s *PostgresStore) QuoteSchema() string {
	return fmt.Sprintf(`"%s"`, s.schema)
}

// Helper functions for UUID <-> int64 conversion for backward compatibility
func hashUUIDToInt64(id uuid.UUID) int64 {
	bytes := id[:]
	var hash int64
	for i := 0; i < 8; i++ {
		hash = (hash << 8) | int64(bytes[i])
	}
	if hash < 0 {
		hash = -hash
	}
	return hash
}

// stringPtrToString converts *string to string, returning empty string if nil
func stringPtrToString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
