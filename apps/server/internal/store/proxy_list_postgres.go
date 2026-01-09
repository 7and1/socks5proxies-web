package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *PostgresStore) UpsertProxyListBatch(ctx context.Context, records []ProxyListRecord) (int, error) {
	if len(records) == 0 {
		return 0, nil
	}

	now := time.Now().UTC()
	batch := &pgx.Batch{}
	query := fmt.Sprintf(`
		INSERT INTO %s.proxy_list (
			host, ip, port, last_seen, delay, cid,
			country_code, country_name, city, region,
			asn, asn_name, org, continent_code,
			checks_up, checks_down, anon,
			http, ssl, socks4, socks5,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13, $14,
			$15, $16, $17,
			$18, $19, $20, $21,
			$22, $23
		)
		ON CONFLICT (ip, port) DO UPDATE SET
			host = EXCLUDED.host,
			last_seen = EXCLUDED.last_seen,
			delay = EXCLUDED.delay,
			cid = EXCLUDED.cid,
			country_code = EXCLUDED.country_code,
			country_name = EXCLUDED.country_name,
			city = EXCLUDED.city,
			region = EXCLUDED.region,
			asn = EXCLUDED.asn,
			asn_name = EXCLUDED.asn_name,
			org = EXCLUDED.org,
			continent_code = EXCLUDED.continent_code,
			checks_up = EXCLUDED.checks_up,
			checks_down = EXCLUDED.checks_down,
			anon = EXCLUDED.anon,
			http = EXCLUDED.http,
			ssl = EXCLUDED.ssl,
			socks4 = EXCLUDED.socks4,
			socks5 = EXCLUDED.socks5,
			updated_at = EXCLUDED.updated_at
	`, s.QuoteSchema())

	for _, record := range records {
		if record.CreatedAt.IsZero() {
			record.CreatedAt = now
		}
		if record.UpdatedAt.IsZero() {
			record.UpdatedAt = now
		}
		if record.LastSeen.IsZero() {
			record.LastSeen = now
		}

		batch.Queue(query,
			record.Host,
			record.IP,
			record.Port,
			record.LastSeen,
			record.Delay,
			record.CID,
			record.CountryCode,
			record.CountryName,
			record.City,
			record.Region,
			record.ASN,
			record.ASNName,
			record.Org,
			record.ContinentCode,
			record.ChecksUp,
			record.ChecksDown,
			record.Anon,
			record.HTTP,
			record.SSL,
			record.Socks4,
			record.Socks5,
			record.CreatedAt,
			record.UpdatedAt,
		)
	}

	br := s.DB.SendBatch(ctx, batch)
	defer br.Close()

	updated := 0
	for range records {
		if _, err := br.Exec(); err != nil {
			return updated, err
		}
		updated++
	}
	return updated, nil
}

func (s *PostgresStore) ListProxyList(ctx context.Context, filters ProxyListFilters) ([]ProxyListRecord, int, error) {
	whereClause, args := buildProxyListWherePostgres(filters, 1)

	if filters.Limit <= 0 {
		filters.Limit = 25
	}
	if filters.Limit > 100 {
		filters.Limit = 100
	}
	if filters.Offset < 0 {
		filters.Offset = 0
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s.proxy_list %s", s.QuoteSchema(), whereClause)
	var total int
	if err := s.DB.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, filters.Limit, filters.Offset)
	query := fmt.Sprintf(`
		SELECT id, host, ip, port, last_seen, delay, cid,
		       country_code, country_name, city, region,
		       asn, asn_name, org, continent_code,
		       checks_up, checks_down, anon,
		       http, ssl, socks4, socks5,
		       created_at, updated_at
		FROM %s.proxy_list
		%s
		ORDER BY last_seen DESC
		LIMIT $%d OFFSET $%d
	`, s.QuoteSchema(), whereClause, len(args)-1, len(args))

	rows, err := s.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	// Performance: Pre-allocate slice with expected capacity
	records := make([]ProxyListRecord, 0, filters.Limit)
	for rows.Next() {
		var record ProxyListRecord
		var lastSeen sql.NullTime
		var countryCode sql.NullString
		var countryName sql.NullString
		var city sql.NullString
		var region sql.NullString
		var asn sql.NullInt32
		var asnName sql.NullString
		var org sql.NullString
		var continent sql.NullString
		var delay sql.NullInt32
		var cid sql.NullString
		var createdAt sql.NullTime
		var updatedAt sql.NullTime

		if err := rows.Scan(
			&record.ID,
			&record.Host,
			&record.IP,
			&record.Port,
			&lastSeen,
			&delay,
			&cid,
			&countryCode,
			&countryName,
			&city,
			&region,
			&asn,
			&asnName,
			&org,
			&continent,
			&record.ChecksUp,
			&record.ChecksDown,
			&record.Anon,
			&record.HTTP,
			&record.SSL,
			&record.Socks4,
			&record.Socks5,
			&createdAt,
			&updatedAt,
		); err != nil {
			return nil, 0, err
		}

		if lastSeen.Valid {
			record.LastSeen = lastSeen.Time
		}
		if delay.Valid {
			record.Delay = int(delay.Int32)
		}
		if cid.Valid {
			record.CID = cid.String
		}
		if countryCode.Valid {
			record.CountryCode = countryCode.String
		}
		if countryName.Valid {
			record.CountryName = countryName.String
		}
		if city.Valid {
			record.City = city.String
		}
		if region.Valid {
			record.Region = region.String
		}
		if asn.Valid {
			record.ASN = int(asn.Int32)
		}
		if asnName.Valid {
			record.ASNName = asnName.String
		}
		if org.Valid {
			record.Org = org.String
		}
		if continent.Valid {
			record.ContinentCode = continent.String
		}
		if createdAt.Valid {
			record.CreatedAt = createdAt.Time
		}
		if updatedAt.Valid {
			record.UpdatedAt = updatedAt.Time
		}

		records = append(records, record)
	}

	return records, total, nil
}

func (s *PostgresStore) ListRecentProxies(ctx context.Context, limit int) ([]ProxyListRecord, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	query := fmt.Sprintf(`
		SELECT id, host, ip, port, last_seen, delay, cid,
		       country_code, country_name, city, region,
		       asn, asn_name, org, continent_code,
		       checks_up, checks_down, anon,
		       http, ssl, socks4, socks5,
		       created_at, updated_at
		FROM %s.proxy_list
		ORDER BY last_seen DESC
		LIMIT $1
	`, s.QuoteSchema())

	rows, err := s.DB.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanProxyListRows(rows)
}

func (s *PostgresStore) ListRandomProxies(ctx context.Context, limit int) ([]ProxyListRecord, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	query := fmt.Sprintf(`
		SELECT id, host, ip, port, last_seen, delay, cid,
		       country_code, country_name, city, region,
		       asn, asn_name, org, continent_code,
		       checks_up, checks_down, anon,
		       http, ssl, socks4, socks5,
		       created_at, updated_at
		FROM %s.proxy_list
		ORDER BY RANDOM()
		LIMIT $1
	`, s.QuoteSchema())

	rows, err := s.DB.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanProxyListRows(rows)
}

func (s *PostgresStore) GetProxyStats(ctx context.Context) (ProxyStats, error) {
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

	query := fmt.Sprintf(`
		SELECT
			COUNT(*) as total,
			COUNT(DISTINCT NULLIF(country_code, '')) as countries,
			COALESCE(SUM(checks_up), 0) as checks_up,
			COALESCE(SUM(checks_down), 0) as checks_down,
			COALESCE(SUM(CASE WHEN http = 1 THEN 1 ELSE 0 END), 0) as http,
			COALESCE(SUM(CASE WHEN ssl = 1 THEN 1 ELSE 0 END), 0) as https,
			COALESCE(SUM(CASE WHEN socks4 = 1 THEN 1 ELSE 0 END), 0) as socks4,
			COALESCE(SUM(CASE WHEN socks5 = 1 THEN 1 ELSE 0 END), 0) as socks5
		FROM %s.proxy_list
	`, s.QuoteSchema())

	if err := s.DB.QueryRow(ctx, query).Scan(
		&row.Total,
		&row.Countries,
		&row.ChecksUp,
		&row.ChecksDown,
		&row.HTTP,
		&row.HTTPS,
		&row.Socks4,
		&row.Socks5,
	); err != nil {
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

func (s *PostgresStore) ListProxyFacets(ctx context.Context, facetType string, limit, offset int) ([]FacetRecord, error) {
	query := fmt.Sprintf(`
		SELECT type, key, count, avg_delay, metadata, updated_at
		FROM %s.facets
		WHERE type = $1
		ORDER BY count DESC, key ASC
	`, s.QuoteSchema())

	args := []interface{}{facetType}
	if limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
		args = append(args, limit, offset)
	}

	rows, err := s.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []FacetRecord
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
			return nil, err
		}
		if len(metadata) > 0 {
			record.Metadata = metadata
		}
		records = append(records, record)
	}

	return records, nil
}

func (s *PostgresStore) CountProxyFacets(ctx context.Context, facetType string) (int, error) {
	query := fmt.Sprintf(`SELECT COUNT(*) FROM %s.facets WHERE type = $1`, s.QuoteSchema())
	var count int
	if err := s.DB.QueryRow(ctx, query, facetType).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (s *PostgresStore) GetASNDetails(ctx context.Context, asn int) (ASNDetails, error) {
	details := ASNDetails{ASN: asn}
	if asn <= 0 {
		return details, nil
	}

	query := fmt.Sprintf(`
		SELECT COALESCE(asn, 0) as asn,
		       COALESCE(asn_name, '') as name,
		       COALESCE(org, '') as org,
		       COUNT(*) as count,
		       COALESCE(AVG(delay), 0) as avg_delay
		FROM %s.proxy_list
		WHERE asn = $1
		GROUP BY asn, asn_name, org
	`, s.QuoteSchema())
	if err := s.DB.QueryRow(ctx, query, asn).Scan(&details.ASN, &details.Name, &details.Org, &details.Count, &details.AvgDelay); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return details, nil
		}
		return details, err
	}

	countryQuery := fmt.Sprintf(`
		SELECT country_code, country_name, COUNT(*) as count, AVG(delay) as avg_delay
		FROM %s.proxy_list
		WHERE asn = $1 AND country_code IS NOT NULL AND country_code != ''
		GROUP BY country_code, country_name
		ORDER BY count DESC
		LIMIT 10
	`, s.QuoteSchema())
	rows, err := s.DB.Query(ctx, countryQuery, asn)
	if err != nil {
		return details, err
	}
	for rows.Next() {
		var code sql.NullString
		var name sql.NullString
		var count int
		var avg sql.NullFloat64
		if err := rows.Scan(&code, &name, &count, &avg); err != nil {
			rows.Close()
			return details, err
		}
		stat := ASNCountryStat{
			Code:  strings.ToUpper(code.String),
			Count: count,
		}
		if name.Valid {
			stat.Name = name.String
		}
		if avg.Valid {
			stat.AvgDelay = avg.Float64
		}
		details.Countries = append(details.Countries, stat)
	}
	rows.Close()

	protocolQuery := fmt.Sprintf(`
		SELECT
			COALESCE(SUM(CASE WHEN http = 1 THEN 1 ELSE 0 END), 0) as http,
			COALESCE(SUM(CASE WHEN ssl = 1 THEN 1 ELSE 0 END), 0) as https,
			COALESCE(SUM(CASE WHEN socks4 = 1 THEN 1 ELSE 0 END), 0) as socks4,
			COALESCE(SUM(CASE WHEN socks5 = 1 THEN 1 ELSE 0 END), 0) as socks5
		FROM %s.proxy_list
		WHERE asn = $1
	`, s.QuoteSchema())
	if err := s.DB.QueryRow(ctx, protocolQuery, asn).Scan(
		&details.Protocols.HTTP,
		&details.Protocols.HTTPS,
		&details.Protocols.Socks4,
		&details.Protocols.Socks5,
	); err != nil {
		return details, err
	}

	return details, nil
}

func (s *PostgresStore) RebuildProxyFacets(ctx context.Context) error {
	type countryRow struct {
		Code     sql.NullString
		Name     sql.NullString
		Count    int
		AvgDelay sql.NullFloat64
	}
	type portRow struct {
		Port     int
		Count    int
		AvgDelay sql.NullFloat64
	}
	type protocolRow struct {
		HTTP   int
		HTTPS  int
		Socks4 int
		Socks5 int
	}
	type cityRow struct {
		Code     sql.NullString
		Name     sql.NullString
		City     sql.NullString
		Count    int
		AvgDelay sql.NullFloat64
	}
	type regionRow struct {
		Code     sql.NullString
		Name     sql.NullString
		Region   sql.NullString
		Count    int
		AvgDelay sql.NullFloat64
	}
	type asnRow struct {
		ASN      sql.NullInt32
		ASNName  sql.NullString
		Org      sql.NullString
		Count    int
		AvgDelay sql.NullFloat64
	}

	var countryRows []countryRow
	countryQuery := fmt.Sprintf(`
		SELECT country_code, country_name, COUNT(*) as count, AVG(delay) as avg_delay
		FROM %s.proxy_list
		WHERE country_code IS NOT NULL AND country_code != ''
		GROUP BY country_code, country_name
	`, s.QuoteSchema())
	rows, err := s.DB.Query(ctx, countryQuery)
	if err != nil {
		return err
	}
	for rows.Next() {
		var row countryRow
		if err := rows.Scan(&row.Code, &row.Name, &row.Count, &row.AvgDelay); err != nil {
			rows.Close()
			return err
		}
		countryRows = append(countryRows, row)
	}
	rows.Close()

	var portRows []portRow
	portQuery := fmt.Sprintf(`
		SELECT port, COUNT(*) as count, AVG(delay) as avg_delay
		FROM %s.proxy_list
		GROUP BY port
	`, s.QuoteSchema())
	portRowsResult, err := s.DB.Query(ctx, portQuery)
	if err != nil {
		return err
	}
	for portRowsResult.Next() {
		var row portRow
		if err := portRowsResult.Scan(&row.Port, &row.Count, &row.AvgDelay); err != nil {
			portRowsResult.Close()
			return err
		}
		portRows = append(portRows, row)
	}
	portRowsResult.Close()

	var cityRows []cityRow
	cityQuery := fmt.Sprintf(`
		SELECT country_code, country_name, city, COUNT(*) as count, AVG(delay) as avg_delay
		FROM %s.proxy_list
		WHERE city IS NOT NULL AND city != ''
		GROUP BY country_code, country_name, city
	`, s.QuoteSchema())
	cityRowsResult, err := s.DB.Query(ctx, cityQuery)
	if err != nil {
		return err
	}
	for cityRowsResult.Next() {
		var row cityRow
		if err := cityRowsResult.Scan(&row.Code, &row.Name, &row.City, &row.Count, &row.AvgDelay); err != nil {
			cityRowsResult.Close()
			return err
		}
		cityRows = append(cityRows, row)
	}
	cityRowsResult.Close()

	var regionRows []regionRow
	regionQuery := fmt.Sprintf(`
		SELECT country_code, country_name, region, COUNT(*) as count, AVG(delay) as avg_delay
		FROM %s.proxy_list
		WHERE region IS NOT NULL AND region != ''
		GROUP BY country_code, country_name, region
	`, s.QuoteSchema())
	regionRowsResult, err := s.DB.Query(ctx, regionQuery)
	if err != nil {
		return err
	}
	for regionRowsResult.Next() {
		var row regionRow
		if err := regionRowsResult.Scan(&row.Code, &row.Name, &row.Region, &row.Count, &row.AvgDelay); err != nil {
			regionRowsResult.Close()
			return err
		}
		regionRows = append(regionRows, row)
	}
	regionRowsResult.Close()

	var asnRows []asnRow
	asnQuery := fmt.Sprintf(`
		SELECT asn, asn_name, org, COUNT(*) as count, AVG(delay) as avg_delay
		FROM %s.proxy_list
		WHERE asn IS NOT NULL AND asn > 0
		GROUP BY asn, asn_name, org
	`, s.QuoteSchema())
	asnRowsResult, err := s.DB.Query(ctx, asnQuery)
	if err != nil {
		return err
	}
	for asnRowsResult.Next() {
		var row asnRow
		if err := asnRowsResult.Scan(&row.ASN, &row.ASNName, &row.Org, &row.Count, &row.AvgDelay); err != nil {
			asnRowsResult.Close()
			return err
		}
		asnRows = append(asnRows, row)
	}
	asnRowsResult.Close()

	var protocol protocolRow
	protocolQuery := fmt.Sprintf(`
		SELECT
			COALESCE(SUM(CASE WHEN http = 1 THEN 1 ELSE 0 END), 0) as http,
			COALESCE(SUM(CASE WHEN ssl = 1 THEN 1 ELSE 0 END), 0) as https,
			COALESCE(SUM(CASE WHEN socks4 = 1 THEN 1 ELSE 0 END), 0) as socks4,
			COALESCE(SUM(CASE WHEN socks5 = 1 THEN 1 ELSE 0 END), 0) as socks5
		FROM %s.proxy_list
	`, s.QuoteSchema())
	if err := s.DB.QueryRow(ctx, protocolQuery).Scan(&protocol.HTTP, &protocol.HTTPS, &protocol.Socks4, &protocol.Socks5); err != nil {
		return err
	}

	now := time.Now().UTC()
	records := make([]FacetRecord, 0, len(countryRows)+len(portRows)+len(cityRows)+len(regionRows)+len(asnRows)+4)

	for _, row := range countryRows {
		if !row.Code.Valid {
			continue
		}
		meta := map[string]string{}
		if row.Name.Valid {
			meta["name"] = row.Name.String
		}
		payload, _ := json.Marshal(meta)
		avg := 0.0
		if row.AvgDelay.Valid {
			avg = row.AvgDelay.Float64
		}
		records = append(records, FacetRecord{
			Type:      "country",
			Key:       strings.ToUpper(row.Code.String),
			Count:     row.Count,
			AvgDelay:  avg,
			Metadata:  payload,
			UpdatedAt: now,
		})
	}

	for _, row := range portRows {
		avg := 0.0
		if row.AvgDelay.Valid {
			avg = row.AvgDelay.Float64
		}
		records = append(records, FacetRecord{
			Type:      "port",
			Key:       fmt.Sprintf("%d", row.Port),
			Count:     row.Count,
			AvgDelay:  avg,
			UpdatedAt: now,
		})
	}

	for _, row := range cityRows {
		if !row.City.Valid {
			continue
		}
		meta := map[string]string{
			"name": row.City.String,
		}
		if row.Code.Valid {
			meta["country_code"] = strings.ToUpper(row.Code.String)
		}
		if row.Name.Valid {
			meta["country_name"] = row.Name.String
		}
		payload, _ := json.Marshal(meta)
		avg := 0.0
		if row.AvgDelay.Valid {
			avg = row.AvgDelay.Float64
		}
		key := row.City.String
		if row.Code.Valid {
			key = strings.ToUpper(row.Code.String) + "|" + row.City.String
		}
		records = append(records, FacetRecord{
			Type:      "city",
			Key:       key,
			Count:     row.Count,
			AvgDelay:  avg,
			Metadata:  payload,
			UpdatedAt: now,
		})
	}

	for _, row := range regionRows {
		if !row.Region.Valid {
			continue
		}
		meta := map[string]string{
			"name": row.Region.String,
		}
		if row.Code.Valid {
			meta["country_code"] = strings.ToUpper(row.Code.String)
		}
		if row.Name.Valid {
			meta["country_name"] = row.Name.String
		}
		payload, _ := json.Marshal(meta)
		avg := 0.0
		if row.AvgDelay.Valid {
			avg = row.AvgDelay.Float64
		}
		key := row.Region.String
		if row.Code.Valid {
			key = strings.ToUpper(row.Code.String) + "|" + row.Region.String
		}
		records = append(records, FacetRecord{
			Type:      "region",
			Key:       key,
			Count:     row.Count,
			AvgDelay:  avg,
			Metadata:  payload,
			UpdatedAt: now,
		})
	}

	for _, row := range asnRows {
		if !row.ASN.Valid {
			continue
		}
		meta := map[string]string{}
		if row.ASNName.Valid {
			meta["name"] = row.ASNName.String
		}
		if row.Org.Valid {
			meta["org"] = row.Org.String
		}
		payload, _ := json.Marshal(meta)
		avg := 0.0
		if row.AvgDelay.Valid {
			avg = row.AvgDelay.Float64
		}
		records = append(records, FacetRecord{
			Type:      "asn",
			Key:       fmt.Sprintf("%d", row.ASN.Int32),
			Count:     row.Count,
			AvgDelay:  avg,
			Metadata:  payload,
			UpdatedAt: now,
		})
	}

	protocolCounts := map[string]int{
		"http":   protocol.HTTP,
		"https":  protocol.HTTPS,
		"socks4": protocol.Socks4,
		"socks5": protocol.Socks5,
	}
	for key, count := range protocolCounts {
		if count == 0 {
			continue
		}
		records = append(records, FacetRecord{
			Type:      "protocol",
			Key:       key,
			Count:     count,
			UpdatedAt: now,
		})
	}

	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, fmt.Sprintf(`DELETE FROM %s.facets`, s.QuoteSchema()))
	if err != nil {
		_ = tx.Rollback(ctx)
		return err
	}

	// Performance: Use batch insert for better throughput
	insertQuery := fmt.Sprintf(`
		INSERT INTO %s.facets (type, key, count, avg_delay, metadata, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, s.QuoteSchema())

	batch := &pgx.Batch{}
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
	for range records {
		if _, err := br.Exec(); err != nil {
			br.Close()
			_ = tx.Rollback(ctx)
			return err
		}
	}
	br.Close()

	return tx.Commit(ctx)
}

func buildProxyListWherePostgres(filters ProxyListFilters, startIndex int) (string, []interface{}) {
	clauses := []string{"1=1"}
	args := make([]interface{}, 0, 6)
	index := startIndex

	if filters.CountryCode != "" {
		clauses = append(clauses, fmt.Sprintf("country_code = $%d", index))
		args = append(args, strings.ToUpper(filters.CountryCode))
		index++
	}
	if filters.Port > 0 {
		clauses = append(clauses, fmt.Sprintf("port = $%d", index))
		args = append(args, filters.Port)
		index++
	}
	if filters.Protocol != "" {
		column := protocolColumn(filters.Protocol)
		if column != "" {
			clauses = append(clauses, column+" = 1")
		}
	}
	if filters.City != "" {
		clauses = append(clauses, fmt.Sprintf("LOWER(city) = LOWER($%d)", index))
		args = append(args, filters.City)
		index++
	}
	if filters.Region != "" {
		clauses = append(clauses, fmt.Sprintf("LOWER(region) = LOWER($%d)", index))
		args = append(args, filters.Region)
		index++
	}
	if filters.ASN > 0 {
		clauses = append(clauses, fmt.Sprintf("asn = $%d", index))
		args = append(args, filters.ASN)
		index++
	}
	if filters.Anonymity != "" {
		values := anonymityLevels(filters.Anonymity)
		if len(values) > 0 {
			placeholders := make([]string, 0, len(values))
			for _, val := range values {
				placeholders = append(placeholders, fmt.Sprintf("$%d", index))
				args = append(args, val)
				index++
			}
			clauses = append(clauses, fmt.Sprintf("anon IN (%s)", strings.Join(placeholders, ",")))
		}
	}

	return "WHERE " + strings.Join(clauses, " AND "), args
}

func scanProxyListRows(rows pgx.Rows) ([]ProxyListRecord, error) {
	// Performance: Pre-allocate with reasonable capacity
	records := make([]ProxyListRecord, 0, 100)
	for rows.Next() {
		var record ProxyListRecord
		var lastSeen sql.NullTime
		var countryCode sql.NullString
		var countryName sql.NullString
		var city sql.NullString
		var region sql.NullString
		var asn sql.NullInt32
		var asnName sql.NullString
		var org sql.NullString
		var continent sql.NullString
		var delay sql.NullInt32
		var cid sql.NullString
		var createdAt sql.NullTime
		var updatedAt sql.NullTime

		if err := rows.Scan(
			&record.ID,
			&record.Host,
			&record.IP,
			&record.Port,
			&lastSeen,
			&delay,
			&cid,
			&countryCode,
			&countryName,
			&city,
			&region,
			&asn,
			&asnName,
			&org,
			&continent,
			&record.ChecksUp,
			&record.ChecksDown,
			&record.Anon,
			&record.HTTP,
			&record.SSL,
			&record.Socks4,
			&record.Socks5,
			&createdAt,
			&updatedAt,
		); err != nil {
			return nil, err
		}

		if lastSeen.Valid {
			record.LastSeen = lastSeen.Time
		}
		if delay.Valid {
			record.Delay = int(delay.Int32)
		}
		if cid.Valid {
			record.CID = cid.String
		}
		if countryCode.Valid {
			record.CountryCode = countryCode.String
		}
		if countryName.Valid {
			record.CountryName = countryName.String
		}
		if city.Valid {
			record.City = city.String
		}
		if region.Valid {
			record.Region = region.String
		}
		if asn.Valid {
			record.ASN = int(asn.Int32)
		}
		if asnName.Valid {
			record.ASNName = asnName.String
		}
		if org.Valid {
			record.Org = org.String
		}
		if continent.Valid {
			record.ContinentCode = continent.String
		}
		if createdAt.Valid {
			record.CreatedAt = createdAt.Time
		}
		if updatedAt.Valid {
			record.UpdatedAt = updatedAt.Time
		}

		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return records, nil
}

var _ ProxyListStore = (*PostgresStore)(nil)

func nullIfEmpty(value []byte) interface{} {
	if len(value) == 0 {
		return nil
	}
	return value
}
