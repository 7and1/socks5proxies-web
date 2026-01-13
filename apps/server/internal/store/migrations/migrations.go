package migrations

import (
	"context"
	"embed"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed *.sql
var sqlFiles embed.FS

// IndexInfo holds information about a database index
type IndexInfo struct {
	Name        string
	Table       string
	Columns     []string
	IsPartial   bool
	IsUnique    bool
	ScanCount   int64
	TupRead     int64
	TupFetch    int64
	IndexSize   string
}

// Migration represents a single database migration
type Migration struct {
	Version   int
	Name      string
	Content   string
	AppliedAt time.Time
}

// Migrator handles database migrations
type Migrator struct {
	db     *pgxpool.Pool
	schema string
}

// NewMigrator creates a new migrator instance
func NewMigrator(db *pgxpool.Pool, schema string) *Migrator {
	return &Migrator{
		db:     db,
		schema: schema,
	}
}

// Run executes all pending migrations
func (m *Migrator) Run(ctx context.Context) error {
	entries, err := sqlFiles.ReadDir(".")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var migrations []Migration
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}

		content, err := sqlFiles.ReadFile(entry.Name())
		if err != nil {
			return fmt.Errorf("read migration file %s: %w", entry.Name(), err)
		}

		// Extract version from filename (e.g., 001_proxy_list_indexes.sql -> 1)
		version := 0
		fmt.Sscanf(entry.Name(), "%d_", &version)

		migrations = append(migrations, Migration{
			Version: version,
			Name:    entry.Name(),
			Content: string(content),
		})
	}

	// Sort by version
	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Version < migrations[j].Version
	})

	// Ensure migrations table exists
	if err := m.ensureMigrationsTable(ctx); err != nil {
		return fmt.Errorf("ensure migrations table: %w", err)
	}

	// Run each migration
	for _, migration := range migrations {
		if err := m.runMigration(ctx, migration); err != nil {
			return fmt.Errorf("run migration %s: %w", migration.Name, err)
		}
	}

	return nil
}

func (m *Migrator) ensureMigrationsTable(ctx context.Context) error {
	query := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s.schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			applied_at TIMESTAMP DEFAULT NOW()
		)
	`, m.quoteSchema())

	_, err := m.db.Exec(ctx, query)
	return err
}

func (m *Migrator) runMigration(ctx context.Context, migration Migration) error {
	// Check if already applied
	var appliedAt time.Time
	checkQuery := fmt.Sprintf(`
		SELECT applied_at FROM %s.schema_migrations WHERE version = $1
	`, m.quoteSchema())
	err := m.db.QueryRow(ctx, checkQuery, migration.Version).Scan(&appliedAt)
	if err == nil {
		// Already applied
		return nil
	}

	// Replace schema placeholder
	sqlContent := strings.ReplaceAll(migration.Content, "{{schema}}", m.quoteSchema())

	// Execute migration
	_, err = m.db.Exec(ctx, sqlContent)
	if err != nil {
		return fmt.Errorf("execute migration: %w", err)
	}

	// Record migration
	insertQuery := fmt.Sprintf(`
		INSERT INTO %s.schema_migrations (version, name, applied_at)
		VALUES ($1, $2, NOW())
	`, m.quoteSchema())
	_, err = m.db.Exec(ctx, insertQuery, migration.Version, migration.Name)
	return err
}

func (m *Migrator) quoteSchema() string {
	return fmt.Sprintf(`"%s"`, m.schema)
}

// GetIndexStats returns statistics about indexes for monitoring
func (m *Migrator) GetIndexStats(ctx context.Context) ([]IndexInfo, error) {
	query := `
		SELECT
			i.indexrelid::regclass as name,
			c.relname as table,
			array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
			ix.indisunique as is_unique,
			COALESCE(s.idx_scan, 0) as scan_count,
			COALESCE(s.idx_tup_read, 0) as tup_read,
			COALESCE(s.idx_tup_fetch, 0) as tup_fetch,
			pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size
		FROM pg_index ix
		JOIN pg_class t ON t.oid = ix.indrelid
		JOIN pg_class c ON c.oid = ix.indexrelid
		JOIN pg_namespace n ON n.oid = t.relnamespace
		JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
		LEFT JOIN pg_stat_user_indexes s ON s.indexrelid = c.oid
		WHERE n.nspname = $1
		GROUP BY c.relname, ix.indisunique, s.idx_scan, s.idx_tup_read, s.idx_tup_fetch, i.indexrelid
		ORDER BY scan_count DESC
	`

	rows, err := m.db.Query(ctx, query, m.schema)
	if err != nil {
		return nil, fmt.Errorf("query index stats: %w", err)
	}
	defer rows.Close()

	var stats []IndexInfo
	for rows.Next() {
		var info IndexInfo
		if err := rows.Scan(&info.Name, &info.Table, &info.Columns, &info.IsUnique, &info.ScanCount, &info.TupRead, &info.TupFetch, &info.IndexSize); err != nil {
			return nil, fmt.Errorf("scan index stat: %w", err)
		}
		stats = append(stats, info)
	}

	return stats, nil
}

// RefreshMaterializedView refreshes the proxy stats materialized view
func (m *Migrator) RefreshMaterializedView(ctx context.Context) error {
	query := fmt.Sprintf("REFRESH MATERIALIZED VIEW CONCURRENTLY %s.proxy_stats_mv", m.quoteSchema())
	_, err := m.db.Exec(ctx, query)
	return err
}

// CreateProxyListIndexes creates all proxy_list indexes
func CreateProxyListIndexes(ctx context.Context, db *pgxpool.Pool, schema string) error {
	// Read the indexes migration file
	content, err := sqlFiles.ReadFile("001_proxy_list_indexes.sql")
	if err != nil {
		return fmt.Errorf("read indexes migration: %w", err)
	}

	sqlContent := strings.ReplaceAll(string(content), "{{schema}}", fmt.Sprintf(`"%s"`, schema))

	// Execute migration
	_, err = db.Exec(ctx, sqlContent)
	if err != nil {
		return fmt.Errorf("create indexes: %w", err)
	}

	return nil
}

// AnalyzeTableStatistics runs ANALYZE on proxy_list to update query planner statistics
func AnalyzeTableStatistics(ctx context.Context, db *pgxpool.Pool, schema string) error {
	query := fmt.Sprintf(`ANALYZE "%s".proxy_list`, schema)
	_, err := db.Exec(ctx, query)
	return err
}
