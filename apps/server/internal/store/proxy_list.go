package store

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// NullableJSON handles NULL and string JSON values from SQLite
type NullableJSON json.RawMessage

func (n *NullableJSON) Scan(value interface{}) error {
	if value == nil {
		*n = nil
		return nil
	}
	switch v := value.(type) {
	case []byte:
		if len(v) == 0 {
			*n = nil
			return nil
		}
		*n = NullableJSON(v)
	case string:
		if v == "" {
			*n = nil
			return nil
		}
		*n = NullableJSON(v)
	default:
		return fmt.Errorf("unsupported type for NullableJSON: %T", value)
	}
	return nil
}

func (n NullableJSON) Value() (driver.Value, error) {
	if n == nil {
		return nil, nil
	}
	return []byte(n), nil
}

func (n NullableJSON) MarshalJSON() ([]byte, error) {
	if n == nil {
		return []byte("null"), nil
	}
	return json.RawMessage(n).MarshalJSON()
}

type ProxyListStore interface {
	UpsertProxyListBatch(ctx context.Context, records []ProxyListRecord) (int, error)
	DeleteStaleProxies(ctx context.Context, cutoff time.Time) (int, error)
	ListProxyList(ctx context.Context, filters ProxyListFilters) ([]ProxyListRecord, int, error)
	ListRecentProxies(ctx context.Context, limit int) ([]ProxyListRecord, error)
	ListRandomProxies(ctx context.Context, limit int) ([]ProxyListRecord, error)
	ListProxyFacets(ctx context.Context, facetType string, limit, offset int) ([]FacetRecord, error)
	CountProxyFacets(ctx context.Context, facetType string) (int, error)
	GetASNDetails(ctx context.Context, asn int) (ASNDetails, error)
	GetProxyStats(ctx context.Context) (ProxyStats, error)
	RebuildProxyFacets(ctx context.Context) error
}

type ProxyListFilters struct {
	CountryCode string
	Protocol    string
	Port        int
	Anonymity   string
	City        string
	Region      string
	ASN         int
	Limit       int
	Offset      int
	Since       time.Time
}

type ProxyListRecord struct {
	ID            int64     `db:"id"`
	Host          string    `db:"host"`
	IP            string    `db:"ip"`
	Port          int       `db:"port"`
	LastSeen      time.Time `db:"last_seen"`
	Delay         int       `db:"delay"`
	CID           string    `db:"cid"`
	CountryCode   string    `db:"country_code"`
	CountryName   string    `db:"country_name"`
	City          string    `db:"city"`
	Region        string    `db:"region"`
	ASN           int       `db:"asn"`
	ASNName       string    `db:"asn_name"`
	Org           string    `db:"org"`
	ContinentCode string    `db:"continent_code"`
	ChecksUp      int       `db:"checks_up"`
	ChecksDown    int       `db:"checks_down"`
	Anon          int       `db:"anon"`
	HTTP          int       `db:"http"`
	SSL           int       `db:"ssl"`
	Socks4        int       `db:"socks4"`
	Socks5        int       `db:"socks5"`
	CreatedAt     time.Time `db:"created_at"`
	UpdatedAt     time.Time `db:"updated_at"`
}

type FacetRecord struct {
	Type      string       `db:"type" json:"type"`
	Key       string       `db:"key" json:"key"`
	Count     int          `db:"count" json:"count"`
	AvgDelay  float64      `db:"avg_delay" json:"avg_delay"`
	Metadata  NullableJSON `db:"metadata" json:"metadata,omitempty"`
	UpdatedAt time.Time    `db:"updated_at" json:"updated_at"`
}

type ASNDetails struct {
	ASN       int                `db:"asn" json:"asn"`
	Name      string             `db:"name" json:"name,omitempty"`
	Org       string             `db:"org" json:"org,omitempty"`
	Count     int                `db:"count" json:"count"`
	AvgDelay  float64            `db:"avg_delay" json:"avg_delay"`
	Countries []ASNCountryStat   `json:"countries"`
	Protocols ASNProtocolSummary `json:"protocols"`
}

type ASNCountryStat struct {
	Code     string  `json:"code"`
	Name     string  `json:"name,omitempty"`
	Count    int     `json:"count"`
	AvgDelay float64 `json:"avg_delay"`
}

type ASNProtocolSummary struct {
	HTTP   int `json:"http"`
	HTTPS  int `json:"https"`
	Socks4 int `json:"socks4"`
	Socks5 int `json:"socks5"`
}

type ProxyStats struct {
	Total     int                `json:"total"`
	Countries int                `json:"countries"`
	AvgUptime int                `json:"avg_uptime"`
	Protocols ProxyProtocolStats `json:"protocols"`
}

type ProxyProtocolStats struct {
	HTTP   int `json:"http"`
	HTTPS  int `json:"https"`
	Socks4 int `json:"socks4"`
	Socks5 int `json:"socks5"`
}

func (s *Store) UpsertProxyListBatch(ctx context.Context, records []ProxyListRecord) (int, error) {
	if len(records) == 0 {
		return 0, nil
	}

	tx, err := s.DB.BeginTxx(ctx, nil)
	if err != nil {
		return 0, err
	}

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO proxy_list (
			host, ip, port, last_seen, delay, cid,
			country_code, country_name, city, region,
			asn, asn_name, org, continent_code,
			checks_up, checks_down, anon,
			http, ssl, socks4, socks5,
			created_at, updated_at
		) VALUES (
			?, ?, ?, ?, ?, ?,
			?, ?, ?, ?,
			?, ?, ?, ?,
			?, ?, ?,
			?, ?, ?, ?,
			?, ?
		)
		ON CONFLICT(ip, port) DO UPDATE SET
			host = excluded.host,
			last_seen = excluded.last_seen,
			delay = excluded.delay,
			cid = excluded.cid,
			country_code = excluded.country_code,
			country_name = excluded.country_name,
			city = excluded.city,
			region = excluded.region,
			asn = excluded.asn,
			asn_name = excluded.asn_name,
			org = excluded.org,
			continent_code = excluded.continent_code,
			checks_up = excluded.checks_up,
			checks_down = excluded.checks_down,
			anon = excluded.anon,
			http = excluded.http,
			ssl = excluded.ssl,
			socks4 = excluded.socks4,
			socks5 = excluded.socks5,
			updated_at = excluded.updated_at
	`)
	if err != nil {
		_ = tx.Rollback()
		return 0, err
	}
	defer stmt.Close()

	updated := 0
	now := time.Now().UTC()
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

		if _, err := stmt.ExecContext(
			ctx,
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
		); err != nil {
			_ = tx.Rollback()
			return updated, err
		}
		updated++
	}

	if err := tx.Commit(); err != nil {
		return updated, err
	}
	return updated, nil
}

func (s *Store) DeleteStaleProxies(ctx context.Context, cutoff time.Time) (int, error) {
	if cutoff.IsZero() {
		return 0, nil
	}
	result, err := s.DB.ExecContext(ctx, `DELETE FROM proxy_list WHERE last_seen < ?`, cutoff)
	if err != nil {
		return 0, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return int(affected), nil
}

func (s *Store) ListProxyList(ctx context.Context, filters ProxyListFilters) ([]ProxyListRecord, int, error) {
	whereClause, args := buildProxyListWhere(filters)
	if filters.Limit <= 0 {
		filters.Limit = 25
	}
	if filters.Limit > 100 {
		filters.Limit = 100
	}
	if filters.Offset < 0 {
		filters.Offset = 0
	}

	var total int
	countQuery := "SELECT COUNT(*) FROM proxy_list " + whereClause
	if err := s.DB.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, host, ip, port, last_seen, delay, cid,
		       country_code, country_name, city, region,
		       asn, asn_name, org, continent_code,
		       checks_up, checks_down, anon,
		       http, ssl, socks4, socks5,
		       created_at, updated_at
		FROM proxy_list
	` + whereClause + " ORDER BY last_seen DESC LIMIT ? OFFSET ?"

	args = append(args, filters.Limit, filters.Offset)
	var records []ProxyListRecord
	if err := s.DB.SelectContext(ctx, &records, query, args...); err != nil {
		return nil, 0, err
	}
	return records, total, nil
}

func (s *Store) ListRecentProxies(ctx context.Context, limit int) ([]ProxyListRecord, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	query := `
		SELECT id, host, ip, port, last_seen, delay, cid,
		       country_code, country_name, city, region,
		       asn, asn_name, org, continent_code,
		       checks_up, checks_down, anon,
		       http, ssl, socks4, socks5,
		       created_at, updated_at
		FROM proxy_list
		ORDER BY last_seen DESC
		LIMIT ?
	`

	var records []ProxyListRecord
	if err := s.DB.SelectContext(ctx, &records, query, limit); err != nil {
		return nil, err
	}
	return records, nil
}

func (s *Store) ListRandomProxies(ctx context.Context, limit int) ([]ProxyListRecord, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	query := `
		SELECT id, host, ip, port, last_seen, delay, cid,
		       country_code, country_name, city, region,
		       asn, asn_name, org, continent_code,
		       checks_up, checks_down, anon,
		       http, ssl, socks4, socks5,
		       created_at, updated_at
		FROM proxy_list
		ORDER BY RANDOM()
		LIMIT ?
	`

	var records []ProxyListRecord
	if err := s.DB.SelectContext(ctx, &records, query, limit); err != nil {
		return nil, err
	}
	return records, nil
}

func (s *Store) GetProxyStats(ctx context.Context) (ProxyStats, error) {
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

	err := s.DB.GetContext(ctx, &row, `
		SELECT
			COUNT(*) as total,
			COUNT(DISTINCT CASE WHEN country_code IS NOT NULL AND country_code != '' THEN country_code END) as countries,
			COALESCE(SUM(checks_up), 0) as checks_up,
			COALESCE(SUM(checks_down), 0) as checks_down,
			COALESCE(SUM(CASE WHEN http = 1 THEN 1 ELSE 0 END), 0) as http,
			COALESCE(SUM(CASE WHEN ssl = 1 THEN 1 ELSE 0 END), 0) as https,
			COALESCE(SUM(CASE WHEN socks4 = 1 THEN 1 ELSE 0 END), 0) as socks4,
			COALESCE(SUM(CASE WHEN socks5 = 1 THEN 1 ELSE 0 END), 0) as socks5
		FROM proxy_list
	`)
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

func (s *Store) ListProxyFacets(ctx context.Context, facetType string, limit, offset int) ([]FacetRecord, error) {
	query := `
		SELECT type, key, count, avg_delay, metadata, updated_at
		FROM facets
		WHERE type = ?
		ORDER BY count DESC, key ASC
	`
	args := []interface{}{facetType}
	if limit > 0 {
		query += " LIMIT ? OFFSET ?"
		args = append(args, limit, offset)
	}

	var records []FacetRecord
	err := s.DB.SelectContext(ctx, &records, query, args...)
	if err != nil {
		return nil, err
	}
	return records, nil
}

func (s *Store) CountProxyFacets(ctx context.Context, facetType string) (int, error) {
	var count int
	if err := s.DB.GetContext(ctx, &count, `SELECT COUNT(*) FROM facets WHERE type = ?`, facetType); err != nil {
		return 0, err
	}
	return count, nil
}

func (s *Store) GetASNDetails(ctx context.Context, asn int) (ASNDetails, error) {
	details := ASNDetails{ASN: asn}
	if asn <= 0 {
		return details, nil
	}

	if err := s.DB.GetContext(ctx, &details, `
		SELECT COALESCE(asn, 0) as asn,
		       COALESCE(asn_name, '') as name,
		       COALESCE(org, '') as org,
		       COUNT(*) as count,
		       COALESCE(AVG(delay), 0) as avg_delay
		FROM proxy_list
		WHERE asn = ?
		GROUP BY asn, asn_name, org
	`, asn); err != nil {
		if err == sql.ErrNoRows {
			return details, nil
		}
		return details, err
	}

	type countryRow struct {
		Code     sql.NullString  `db:"country_code"`
		Name     sql.NullString  `db:"country_name"`
		Count    int             `db:"count"`
		AvgDelay sql.NullFloat64 `db:"avg_delay"`
	}
	var countryRows []countryRow
	if err := s.DB.SelectContext(ctx, &countryRows, `
		SELECT country_code, country_name, COUNT(*) as count, AVG(delay) as avg_delay
		FROM proxy_list
		WHERE asn = ? AND country_code IS NOT NULL AND country_code != ''
		GROUP BY country_code, country_name
		ORDER BY count DESC
		LIMIT 10
	`, asn); err != nil {
		return details, err
	}

	for _, row := range countryRows {
		stat := ASNCountryStat{
			Code:  strings.ToUpper(row.Code.String),
			Count: row.Count,
		}
		if row.Name.Valid {
			stat.Name = row.Name.String
		}
		if row.AvgDelay.Valid {
			stat.AvgDelay = row.AvgDelay.Float64
		}
		details.Countries = append(details.Countries, stat)
	}

	if err := s.DB.GetContext(ctx, &details.Protocols, `
		SELECT
			COALESCE(SUM(CASE WHEN http = 1 THEN 1 ELSE 0 END), 0) as http,
			COALESCE(SUM(CASE WHEN ssl = 1 THEN 1 ELSE 0 END), 0) as https,
			COALESCE(SUM(CASE WHEN socks4 = 1 THEN 1 ELSE 0 END), 0) as socks4,
			COALESCE(SUM(CASE WHEN socks5 = 1 THEN 1 ELSE 0 END), 0) as socks5
		FROM proxy_list
		WHERE asn = ?
	`, asn); err != nil {
		return details, err
	}

	return details, nil
}

func (s *Store) RebuildProxyFacets(ctx context.Context) error {
	type countryRow struct {
		Code     sql.NullString  `db:"country_code"`
		Name     sql.NullString  `db:"country_name"`
		Count    int             `db:"count"`
		AvgDelay sql.NullFloat64 `db:"avg_delay"`
	}
	type portRow struct {
		Port     int             `db:"port"`
		Count    int             `db:"count"`
		AvgDelay sql.NullFloat64 `db:"avg_delay"`
	}
	type cityRow struct {
		Code     sql.NullString  `db:"country_code"`
		Name     sql.NullString  `db:"country_name"`
		City     sql.NullString  `db:"city"`
		Count    int             `db:"count"`
		AvgDelay sql.NullFloat64 `db:"avg_delay"`
	}
	type regionRow struct {
		Code     sql.NullString  `db:"country_code"`
		Name     sql.NullString  `db:"country_name"`
		Region   sql.NullString  `db:"region"`
		Count    int             `db:"count"`
		AvgDelay sql.NullFloat64 `db:"avg_delay"`
	}
	type asnRow struct {
		ASN      sql.NullInt32   `db:"asn"`
		ASNName  sql.NullString  `db:"asn_name"`
		Org      sql.NullString  `db:"org"`
		Count    int             `db:"count"`
		AvgDelay sql.NullFloat64 `db:"avg_delay"`
	}
	type protocolRow struct {
		HTTP   int `db:"http"`
		HTTPS  int `db:"https"`
		Socks4 int `db:"socks4"`
		Socks5 int `db:"socks5"`
	}

	var countryRows []countryRow
	if err := s.DB.SelectContext(ctx, &countryRows, `
		SELECT country_code, country_name, COUNT(*) as count, AVG(delay) as avg_delay
		FROM proxy_list
		WHERE country_code IS NOT NULL AND country_code != ''
		GROUP BY country_code, country_name
	`); err != nil {
		return err
	}

	var portRows []portRow
	if err := s.DB.SelectContext(ctx, &portRows, `
		SELECT port, COUNT(*) as count, AVG(delay) as avg_delay
		FROM proxy_list
		GROUP BY port
	`); err != nil {
		return err
	}

	var cityRows []cityRow
	if err := s.DB.SelectContext(ctx, &cityRows, `
		SELECT country_code, country_name, city, COUNT(*) as count, AVG(delay) as avg_delay
		FROM proxy_list
		WHERE city IS NOT NULL AND city != ''
		GROUP BY country_code, country_name, city
	`); err != nil {
		return err
	}

	var regionRows []regionRow
	if err := s.DB.SelectContext(ctx, &regionRows, `
		SELECT country_code, country_name, region, COUNT(*) as count, AVG(delay) as avg_delay
		FROM proxy_list
		WHERE region IS NOT NULL AND region != ''
		GROUP BY country_code, country_name, region
	`); err != nil {
		return err
	}

	var asnRows []asnRow
	if err := s.DB.SelectContext(ctx, &asnRows, `
		SELECT asn, asn_name, org, COUNT(*) as count, AVG(delay) as avg_delay
		FROM proxy_list
		WHERE asn IS NOT NULL AND asn > 0
		GROUP BY asn, asn_name, org
	`); err != nil {
		return err
	}

	var protocol protocolRow
	if err := s.DB.GetContext(ctx, &protocol, `
		SELECT
			SUM(CASE WHEN http = 1 THEN 1 ELSE 0 END) as http,
			SUM(CASE WHEN ssl = 1 THEN 1 ELSE 0 END) as https,
			SUM(CASE WHEN socks4 = 1 THEN 1 ELSE 0 END) as socks4,
			SUM(CASE WHEN socks5 = 1 THEN 1 ELSE 0 END) as socks5
		FROM proxy_list
	`); err != nil {
		return err
	}

	records := make([]FacetRecord, 0, len(countryRows)+len(portRows)+len(cityRows)+len(regionRows)+len(asnRows)+4)
	now := time.Now().UTC()

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

	tx, err := s.DB.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM facets`); err != nil {
		_ = tx.Rollback()
		return err
	}

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO facets (type, key, count, avg_delay, metadata, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		_ = tx.Rollback()
		return err
	}
	defer stmt.Close()

	for _, record := range records {
		if _, err := stmt.ExecContext(ctx,
			record.Type,
			record.Key,
			record.Count,
			record.AvgDelay,
			record.Metadata,
			record.UpdatedAt,
		); err != nil {
			_ = tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

func buildProxyListWhere(filters ProxyListFilters) (string, []interface{}) {
	clauses := []string{"1=1"}
	args := make([]interface{}, 0, 6)

	if filters.CountryCode != "" {
		clauses = append(clauses, "country_code = ?")
		args = append(args, strings.ToUpper(filters.CountryCode))
	}
	if filters.Port > 0 {
		clauses = append(clauses, "port = ?")
		args = append(args, filters.Port)
	}
	if filters.Protocol != "" {
		column := protocolColumn(filters.Protocol)
		if column != "" {
			clauses = append(clauses, column+" = 1")
		}
	}
	if filters.City != "" {
		clauses = append(clauses, "LOWER(city) = LOWER(?)")
		args = append(args, filters.City)
	}
	if filters.Region != "" {
		clauses = append(clauses, "LOWER(region) = LOWER(?)")
		args = append(args, filters.Region)
	}
	if filters.ASN > 0 {
		clauses = append(clauses, "asn = ?")
		args = append(args, filters.ASN)
	}
	if filters.Anonymity != "" {
		values := anonymityLevels(filters.Anonymity)
		if len(values) > 0 {
			placeholders := strings.Repeat("?,", len(values))
			placeholders = strings.TrimRight(placeholders, ",")
			clauses = append(clauses, fmt.Sprintf("anon IN (%s)", placeholders))
			for _, val := range values {
				args = append(args, val)
			}
		}
	}
	if !filters.Since.IsZero() {
		clauses = append(clauses, "last_seen >= ?")
		args = append(args, filters.Since)
	}

	return "WHERE " + strings.Join(clauses, " AND "), args
}

func protocolColumn(protocol string) string {
	switch strings.ToLower(protocol) {
	case "http":
		return "http"
	case "https":
		return "ssl"
	case "socks4":
		return "socks4"
	case "socks5":
		return "socks5"
	default:
		return ""
	}
}

func anonymityLevels(level string) []int {
	switch strings.ToLower(level) {
	case "elite":
		return []int{4, 5}
	case "anonymous":
		return []int{2, 3}
	case "transparent":
		return []int{0, 1}
	default:
		return nil
	}
}

var _ ProxyListStore = (*Store)(nil)
var _ ProxyListStore = (*UnifiedStore)(nil)
