package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// RebuildProxyFacetsOptimized is an optimized version of RebuildProxyFacets
// that uses a single query with UNION ALL instead of multiple separate queries
func (s *PostgresStore) RebuildProxyFacetsOptimized(ctx context.Context) error {
	// Use a single CTE-based query to gather all facet data in one pass
	// This reduces round trips and allows PostgreSQL to optimize the execution plan
	query := fmt.Sprintf(`
		WITH country_facets AS (
			SELECT
				'country' as type,
				UPPER(country_code) as key,
				COUNT(*) as count,
				AVG(delay) as avg_delay,
				jsonb_build_object('name', country_name) as metadata,
				NOW() as updated_at
			FROM %s.proxy_list
			WHERE country_code IS NOT NULL AND country_code != ''
			GROUP BY country_code, country_name
		),
		port_facets AS (
			SELECT
				'port' as type,
				CAST(port AS TEXT) as key,
				COUNT(*) as count,
				AVG(delay) as avg_delay,
				'{}'::jsonb as metadata,
				NOW() as updated_at
			FROM %s.proxy_list
			GROUP BY port
		),
		city_facets AS (
			SELECT
				'city' as type,
				UPPER(country_code) || '|' || city as key,
				COUNT(*) as count,
				AVG(delay) as avg_delay,
				jsonb_build_object(
					'name', city,
					'country_code', UPPER(country_code),
					'country_name', country_name
				) as metadata,
				NOW() as updated_at
			FROM %s.proxy_list
			WHERE city IS NOT NULL AND city != ''
			GROUP BY country_code, country_name, city
		),
		region_facets AS (
			SELECT
				'region' as type,
				UPPER(country_code) || '|' || region as key,
				COUNT(*) as count,
				AVG(delay) as avg_delay,
				jsonb_build_object(
					'name', region,
					'country_code', UPPER(country_code),
					'country_name', country_name
				) as metadata,
				NOW() as updated_at
			FROM %s.proxy_list
			WHERE region IS NOT NULL AND region != ''
			GROUP BY country_code, country_name, region
		),
		asn_facets AS (
			SELECT
				'asn' as type,
				CAST(asn AS TEXT) as key,
				COUNT(*) as count,
				AVG(delay) as avg_delay,
				jsonb_build_object(
					'name', asn_name,
					'org', org
				) as metadata,
				NOW() as updated_at
			FROM %s.proxy_list
			WHERE asn IS NOT NULL AND asn > 0
			GROUP BY asn, asn_name, org
		),
		protocol_facets AS (
			SELECT * FROM (VALUES
				('http',   (SELECT COUNT(*) FROM %s.proxy_list WHERE http = 1)),
				('https',  (SELECT COUNT(*) FROM %s.proxy_list WHERE ssl = 1)),
				('socks4', (SELECT COUNT(*) FROM %s.proxy_list WHERE socks4 = 1)),
				('socks5', (SELECT COUNT(*) FROM %s.proxy_list WHERE socks5 = 1))
			) AS p(type, count)
			WHERE p.count > 0
		)
		SELECT type, key, count, avg_delay, metadata, updated_at
		FROM country_facets
		UNION ALL
		SELECT type, key, count, avg_delay, metadata, updated_at FROM port_facets
		UNION ALL
		SELECT type, key, count, avg_delay, metadata, updated_at FROM city_facets
		UNION ALL
		SELECT type, key, count, avg_delay, metadata, updated_at FROM region_facets
		UNION ALL
		SELECT type, key, count, 0.0, NULL, NOW() FROM protocol_facets
		UNION ALL
		SELECT type, key, count, avg_delay, metadata, updated_at FROM asn_facets
	`, s.QuoteSchema(), s.QuoteSchema(), s.QuoteSchema(), s.QuoteSchema(), s.QuoteSchema(),
		s.QuoteSchema(), s.QuoteSchema(), s.QuoteSchema(), s.QuoteSchema())

	rows, err := s.DB.Query(ctx, query)
	if err != nil {
		return fmt.Errorf("query facets: %w", err)
	}
	defer rows.Close()

	records := make([]FacetRecord, 0, 500)
	for rows.Next() {
		var record FacetRecord
		var metadata []byte
		if err := rows.Scan(
			&record.Type,
			&record.Key,
			&record.Count,
			&record.AvgDelay,
			&metadata,
			&record.UpdatedAt,
		); err != nil {
			return fmt.Errorf("scan facet: %w", err)
		}
		if len(metadata) > 0 {
			record.Metadata = metadata
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	// Use TRUNCATE for faster delete + reset sequence
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, fmt.Sprintf(`TRUNCATE TABLE %s.facets`, s.QuoteSchema()))
	if err != nil {
		_ = tx.Rollback(ctx)
		return fmt.Errorf("truncate facets: %w", err)
	}

	// Batch insert using COPY for better performance
	batch := &pgx.Batch{}
	insertQuery := fmt.Sprintf(`
		INSERT INTO %s.facets (type, key, count, avg_delay, metadata, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, s.QuoteSchema())

	for _, record := range records {
		batch.Queue(insertQuery,
			record.Type,
			record.Key,
			record.Count,
			record.AvgDelay,
			nullIfEmpty(record.Metadata),
			record.UpdatedAt,
		)
	}

	br := tx.SendBatch(ctx, batch)
	defer br.Close()

	for range records {
		if _, err := br.Exec(); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("insert facet: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// GetASNDetailsOptimized uses a single query with CTEs to get all ASN details
func (s *PostgresStore) GetASNDetailsOptimized(ctx context.Context, asn int) (ASNDetails, error) {
	details := ASNDetails{ASN: asn}
	if asn <= 0 {
		return details, nil
	}

	query := fmt.Sprintf(`
		WITH asn_info AS (
			SELECT
				COALESCE(asn, 0) as asn,
				COALESCE(asn_name, '') as name,
				COALESCE(org, '') as org,
				COUNT(*) as count,
				COALESCE(AVG(delay), 0) as avg_delay
			FROM %s.proxy_list
			WHERE asn = $1
			GROUP BY asn, asn_name, org
		),
		country_stats AS (
			SELECT
				country_code,
				country_name,
				COUNT(*) as count,
				AVG(delay) as avg_delay
			FROM %s.proxy_list
			WHERE asn = $1 AND country_code IS NOT NULL AND country_code != ''
			GROUP BY country_code, country_name
			ORDER BY count DESC
			LIMIT 10
		),
		protocol_stats AS (
			SELECT
				COALESCE(SUM(CASE WHEN http = 1 THEN 1 ELSE 0 END), 0) as http,
				COALESCE(SUM(CASE WHEN ssl = 1 THEN 1 ELSE 0 END), 0) as https,
				COALESCE(SUM(CASE WHEN socks4 = 1 THEN 1 ELSE 0 END), 0) as socks4,
				COALESCE(SUM(CASE WHEN socks5 = 1 THEN 1 ELSE 0 END), 0) as socks5
			FROM %s.proxy_list
			WHERE asn = $1
		)
		SELECT
			(SELECT asn FROM asn_info) as asn,
			(SELECT name FROM asn_info) as name,
			(SELECT org FROM asn_info) as org,
			(SELECT count FROM asn_info) as count,
			(SELECT avg_delay FROM asn_info) as avg_delay,
			(
				SELECT jsonb_agg(jsonb_build_object(
					'code', UPPER(country_code),
					'name', country_name,
					'count', count,
					'avg_delay', avg_delay
				))
				FROM country_stats
			) as countries_json,
			(SELECT http FROM protocol_stats) as http,
			(SELECT https FROM protocol_stats) as https,
			(SELECT socks4 FROM protocol_stats) as socks4,
			(SELECT socks5 FROM protocol_stats) as socks5
	`, s.QuoteSchema(), s.QuoteSchema(), s.QuoteSchema())

	var name, org sql.NullString
	var countriesJSON []byte
	if err := s.DB.QueryRow(ctx, query, asn).Scan(
		&details.ASN,
		&name,
		&org,
		&details.Count,
		&details.AvgDelay,
		&countriesJSON,
		&details.Protocols.HTTP,
		&details.Protocols.HTTPS,
		&details.Protocols.Socks4,
		&details.Protocols.Socks5,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return details, nil
		}
		return details, err
	}

	if name.Valid {
		details.Name = name.String
	}
	if org.Valid {
		details.Org = org.String
	}

	// Parse countries JSON
	if len(countriesJSON) > 0 {
		if err := json.Unmarshal(countriesJSON, &details.Countries); err != nil {
			// Fall back to empty slice on parse error
			details.Countries = []ASNCountryStat{}
		}
	}

	return details, nil
}

// ListProxyListOptimized uses materialized path for better pagination
// and allows "seek" pagination instead of OFFSET for large datasets
func (s *PostgresStore) ListProxyListOptimized(ctx context.Context, filters ProxyListFilters, lastSeen *time.Time, lastID int64) ([]ProxyListRecord, bool, error) {
	whereClause, args := buildProxyListWherePostgres(filters, 1)

	limit := filters.Limit
	if limit <= 0 {
		limit = 25
	}
	if limit > 100 {
		limit = 100
	}

	// Seek-based pagination using (last_seen, id) tuple
	// This is more efficient than OFFSET for large offsets
	query := fmt.Sprintf(`
		SELECT id, host, ip, port, last_seen, delay, cid,
		       country_code, country_name, city, region,
		       asn, asn_name, org, continent_code,
		       checks_up, checks_down, anon,
		       http, ssl, socks4, socks5,
		       created_at, updated_at
		FROM %s.proxy_list
		%s`, s.QuoteSchema(), whereClause)

	index := len(args) + 1
	if lastSeen != nil && !lastSeen.IsZero() {
		query += fmt.Sprintf(" AND (last_seen < $%d OR (last_seen = $%d AND id < $%d))", index, index, index+1)
		args = append(args, *lastSeen, *lastSeen, lastID)
		index += 2
	}

	query += fmt.Sprintf(" ORDER BY last_seen DESC, id DESC LIMIT $%d", index)
	args = append(args, limit+1) // Fetch one extra to check for more results

	rows, err := s.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()

	records, err := scanProxyListRows(rows)
	if err != nil {
		return nil, false, err
	}

	hasMore := len(records) > limit
	if hasMore {
		records = records[:limit]
	}

	return records, hasMore, nil
}

// GetProxyStatsMaterialized uses a pre-computed materialized view for stats
// Create materialized view: CREATE MATERIALIZED VIEW socksproxies.proxy_stats_mv AS ...
func (s *PostgresStore) GetProxyStatsMaterialized(ctx context.Context) (ProxyStats, error) {
	query := fmt.Sprintf(`
		SELECT
			COALESCE(total, 0) as total,
			COALESCE(countries, 0) as countries,
			COALESCE(checks_up, 0) as checks_up,
			COALESCE(checks_down, 0) as checks_down,
			COALESCE(http, 0) as http,
			COALESCE(https, 0) as https,
			COALESCE(socks4, 0) as socks4,
			COALESCE(socks5, 0) as socks5
		FROM %s.proxy_stats_mv
	`, s.QuoteSchema())

	var row struct {
		Total      int `db:"total"`
		Countries  int `db:"countries"`
		ChecksUp   int `db:"checks_up"`
		ChecksDown int `db:"checks_down"`
		HTTP       int `db:"http"`
		HTTPS      int `db:"https"`
		Socks4     int `db:"socks4"`
		Socks5     int `db:"socks5"`
	}

	err := s.DB.QueryRow(ctx, query).Scan(
		&row.Total,
		&row.Countries,
		&row.ChecksUp,
		&row.ChecksDown,
		&row.HTTP,
		&row.HTTPS,
		&row.Socks4,
		&row.Socks5,
	)
	if err != nil {
		return ProxyStats{}, err
	}

	totalChecks := row.ChecksUp + row.ChecksDown
	avgUptime := 0
	if totalChecks > 0 {
		avgUptime = int(float64(row.ChecksUp) / float64(totalChecks) * 100)
	}

	return ProxyStats{
		Total:     row.Total,
		Countries: row.Countries,
		AvgUptime: avgUptime,
		Protocols: ProxyProtocolStats{
			HTTP:   row.HTTP,
			HTTPS:  row.HTTPS,
			Socks4: row.Socks4,
			Socks5: row.Socks5,
		},
	}, nil
}

// RefreshProxyStats refreshes the materialized view for stats
func (s *PostgresStore) RefreshProxyStats(ctx context.Context) error {
	_, err := s.DB.Exec(ctx, fmt.Sprintf("REFRESH MATERIALIZED VIEW CONCURRENTLY %s.proxy_stats_mv", s.QuoteSchema()))
	return err
}

// ListRandomProxiesOptimized uses TABLESAMPLE for better random sampling
// This is much faster than ORDER BY RANDOM() on large tables
func (s *PostgresStore) ListRandomProxiesOptimized(ctx context.Context, limit int) ([]ProxyListRecord, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	// Use TABLESAMPLE for efficient random sampling
	// BERNOULLI samples individual rows, SYSTEM samples pages (faster but less random)
	// We use a larger sample and then limit to get exactly what we need
	query := fmt.Sprintf(`
		SELECT id, host, ip, port, last_seen, delay, cid,
		       country_code, country_name, city, region,
		       asn, asn_name, org, continent_code,
		       checks_up, checks_down, anon,
		       http, ssl, socks4, socks5,
		       created_at, updated_at
		FROM %s.proxy_list TABLESAMPLE SYSTEM(1)
		WHERE last_seen > NOW() - INTERVAL '7 days'
		ORDER BY RANDOM()
		LIMIT $1
	`, s.QuoteSchema())

	rows, err := s.DB.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// If TABLESAMPLE returns too few rows, fall back to regular query
	records, err := scanProxyListRows(rows)
	if err != nil {
		return nil, err
	}

	// If we got at least the requested limit, return results
	if len(records) >= limit {
		return records[:limit], nil
	}

	// Otherwise, fall back to standard query
	return s.ListRandomProxies(ctx, limit)
}
