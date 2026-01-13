-- Proxy List Index Optimization for PostgreSQL
-- File: 001_proxy_list_indexes.sql
-- Description: Performance indexes for proxy_list table based on query patterns

-- =============================================================================
-- Single Column Indexes
-- =============================================================================

-- Index for last_seen ordering (most common ORDER BY clause)
CREATE INDEX IF NOT EXISTS idx_proxy_list_last_seen
    ON "{{schema}}".proxy_list(last_seen DESC);

-- Index for country_code filtering (most common WHERE clause)
CREATE INDEX IF NOT EXISTS idx_proxy_list_country_code
    ON "{{schema}}".proxy_list(country_code)
    WHERE country_code IS NOT NULL AND country_code != '';

-- Index for port filtering
CREATE INDEX IF NOT EXISTS idx_proxy_list_port
    ON "{{schema}}".proxy_list(port)
    WHERE port > 0;

-- Index for ASN filtering
CREATE INDEX IF NOT EXISTS idx_proxy_list_asn
    ON "{{schema}}".proxy_list(asn)
    WHERE asn IS NOT NULL AND asn > 0;

-- Index for city filtering (partial index for non-empty values)
CREATE INDEX IF NOT EXISTS idx_proxy_list_city
    ON "{{schema}}".proxy_list(LOWER(city))
    WHERE city IS NOT NULL AND city != '';

-- Index for region filtering (partial index for non-empty values)
CREATE INDEX IF NOT EXISTS idx_proxy_list_region
    ON "{{schema}}".proxy_list(LOWER(region))
    WHERE region IS NOT NULL AND region != '';

-- Index for anonymity level
CREATE INDEX IF NOT EXISTS idx_proxy_list_anon
    ON "{{schema}}".proxy_list(anon)
    WHERE anon > 0;

-- Index for delay/latency filtering
CREATE INDEX IF NOT EXISTS idx_proxy_list_delay
    ON "{{schema}}".proxy_list(delay)
    WHERE delay IS NOT NULL AND delay > 0;

-- =============================================================================
-- Protocol Type Indexes (Partial indexes for active proxies)
-- =============================================================================

-- Partial index for SOCKS5 proxies (only indexes where socks5 = 1)
CREATE INDEX IF NOT EXISTS idx_proxy_list_socks5_active
    ON "{{schema}}".proxy_list(last_seen DESC)
    WHERE socks5 = 1;

-- Partial index for HTTP proxies
CREATE INDEX IF NOT EXISTS idx_proxy_list_http_active
    ON "{{schema}}".proxy_list(last_seen DESC)
    WHERE http = 1;

-- Partial index for HTTPS/SSL proxies
CREATE INDEX IF NOT EXISTS idx_proxy_list_ssl_active
    ON "{{schema}}".proxy_list(last_seen DESC)
    WHERE ssl = 1;

-- Partial index for SOCKS4 proxies
CREATE INDEX IF NOT EXISTS idx_proxy_list_socks4_active
    ON "{{schema}}".proxy_list(last_seen DESC)
    WHERE socks4 = 1;

-- =============================================================================
-- Composite Indexes for Common Query Patterns
-- =============================================================================

-- Pattern: WHERE socks5 = true AND country_code = ? ORDER BY last_seen DESC
-- Used for: SOCKS5 proxy list by country pages
CREATE INDEX IF NOT EXISTS idx_proxy_list_socks5_country_last_seen
    ON "{{schema}}".proxy_list(country_code, last_seen DESC)
    WHERE socks5 = 1;

-- Pattern: WHERE country_code = ? AND port = ? ORDER BY last_seen DESC
-- Used for: Proxy list filtered by country and port
CREATE INDEX IF NOT EXISTS idx_proxy_list_country_port_last_seen
    ON "{{schema}}".proxy_list(country_code, port, last_seen DESC)
    WHERE country_code IS NOT NULL AND country_code != '' AND port > 0;

-- Pattern: WHERE asn = ? AND country_code = ?
-- Used for: ASN details query
CREATE INDEX IF NOT EXISTS idx_proxy_list_asn_country
    ON "{{schema}}".proxy_list(asn, country_code)
    WHERE asn IS NOT NULL AND asn > 0;

-- Pattern: WHERE country_code = ? AND city IS NOT NULL
-- Used for: City-based proxy filtering
CREATE INDEX IF NOT EXISTS idx_proxy_list_country_city
    ON "{{schema}}".proxy_list(country_code, LOWER(city))
    WHERE country_code IS NOT NULL AND country_code != ''
      AND city IS NOT NULL AND city != '';

-- Pattern: WHERE country_code = ? AND region IS NOT NULL
-- Used for: Region-based proxy filtering
CREATE INDEX IF NOT EXISTS idx_proxy_list_country_region
    ON "{{schema}}".proxy_list(country_code, LOWER(region))
    WHERE country_code IS NOT NULL AND country_code != ''
      AND region IS NOT NULL AND region != '';

-- Pattern: WHERE socks5 = 1 OR http = 1 (protocol filtering)
-- Index covering all protocol flags for multi-protocol queries
CREATE INDEX IF NOT EXISTS idx_proxy_list_protocol_flags
    ON "{{schema}}".proxy_list(http, ssl, socks4, socks5)
    WHERE http = 1 OR ssl = 1 OR socks4 = 1 OR socks5 = 1;

-- =============================================================================
-- Facets Table Indexes
-- =============================================================================

-- Primary lookup for facets by type with ordering
CREATE INDEX IF NOT EXISTS idx_facets_type_count
    ON "{{schema}}".facets(type, count DESC, key)
    WHERE count > 0;

-- Index for facet updates (finding by type and updated_at)
CREATE INDEX IF NOT EXISTS idx_facets_type_updated
    ON "{{schema}}".facets(type, updated_at DESC);

-- Unique constraint already exists as PRIMARY KEY (type, key)

-- =============================================================================
-- Upsert Optimization Index
-- =============================================================================

-- Index for UPSERT ... ON CONFLICT (ip, port) DO UPDATE
-- This is the unique constraint for upsert operations
-- Note: Already exists as UNIQUE(ip, port) but listed for completeness
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_proxy_list_ip_port_unique
--     ON "{{schema}}".proxy_list(ip, port);

-- =============================================================================
-- Cleanup Indexes (for data maintenance queries)
-- =============================================================================

-- Index for finding stale proxies (last_seen older than X days)
CREATE INDEX IF NOT EXISTS idx_proxy_list_last_seen_cleanup
    ON "{{schema}}".proxy_list(last_seen)
    WHERE last_seen < NOW() - INTERVAL '30 days';

-- =============================================================================
-- Statistics and Monitoring
-- =============================================================================

-- Comment to document index usage (PostgreSQL doesn't have index comments,
-- but these are useful for documentation)
-- Index Usage:
-- - idx_proxy_list_last_seen: Used for all ORDER BY last_seen DESC queries
-- - idx_proxy_list_socks5_country_last_seen: Critical for country-specific SOCKS5 pages
-- - idx_proxy_list_country_port_last_seen: Used for port-specific country queries
-- - idx_proxy_list_asn_country: Used for ASN detail pages

-- =============================================================================
-- Index Maintenance Note
-- =============================================================================

-- Partial indexes (with WHERE clause) are smaller and faster
-- They only index rows that match the WHERE condition
-- This reduces index size and maintenance overhead

-- To analyze index usage after deployment:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = '{{schema}}'
-- ORDER BY idx_scan DESC;

-- To find missing indexes:
-- SELECT * FROM pg_stat_user_indexes
-- WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey';
