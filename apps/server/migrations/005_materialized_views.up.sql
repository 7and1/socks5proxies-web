-- Socks5Proxies Materialized Views for Performance
-- Version: 005
-- Purpose: Pre-compute expensive aggregations for fast stats queries

-- ============================================================================
-- MATERIALIZED VIEW FOR PROXY STATS
-- ============================================================================

-- Create materialized view for fast proxy stats access
-- This is updated concurrently (without locking) via REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE MATERIALIZED VIEW IF NOT EXISTS socksproxies.proxy_stats_mv AS
SELECT
    COUNT(*) as total,
    COUNT(DISTINCT NULLIF(country_code, '')) as countries,
    COALESCE(SUM(checks_up), 0) as checks_up,
    COALESCE(SUM(checks_down), 0) as checks_down,
    COALESCE(SUM(CASE WHEN http = 1 THEN 1 ELSE 0 END), 0) as http,
    COALESCE(SUM(CASE WHEN ssl = 1 THEN 1 ELSE 0 END), 0) as https,
    COALESCE(SUM(CASE WHEN socks4 = 1 THEN 1 ELSE 0 END), 0) as socks4,
    COALESCE(SUM(CASE WHEN socks5 = 1 THEN 1 ELSE 0 END), 0) as socks5,
    NOW() as last_updated
FROM socksproxies.proxy_list;

-- Create unique index on materialized view (required for CONCURRENTLY refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_proxy_stats_mv_singleton
    ON socksproxies.proxy_stats_mv((true));

-- ============================================================================
-- MATERIALIZED VIEW FOR ACTIVE PROXY COUNTS BY PROTOCOL
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS socksproxies.protocol_stats_mv AS
SELECT
    'http' as protocol,
    COUNT(*) FILTER (WHERE http = 1) as count,
    COUNT(*) FILTER (WHERE http = 1) as active_count,
    AVG(delay) FILTER (WHERE http = 1) as avg_delay,
    NOW() as last_updated
FROM socksproxies.proxy_list
UNION ALL
SELECT
    'https' as protocol,
    COUNT(*) FILTER (WHERE ssl = 1) as count,
    COUNT(*) FILTER (WHERE ssl = 1) as active_count,
    AVG(delay) FILTER (WHERE ssl = 1) as avg_delay,
    NOW() as last_updated
FROM socksproxies.proxy_list
UNION ALL
SELECT
    'socks4' as protocol,
    COUNT(*) FILTER (WHERE socks4 = 1) as count,
    COUNT(*) FILTER (WHERE socks4 = 1) as active_count,
    AVG(delay) FILTER (WHERE socks4 = 1) as avg_delay,
    NOW() as last_updated
FROM socksproxies.proxy_list
UNION ALL
SELECT
    'socks5' as protocol,
    COUNT(*) FILTER (WHERE socks5 = 1) as count,
    COUNT(*) FILTER (WHERE socks5 = 1) as active_count,
    AVG(delay) FILTER (WHERE socks5 = 1) as avg_delay,
    NOW() as last_updated
FROM socksproxies.proxy_list;

CREATE UNIQUE INDEX IF NOT EXISTS idx_protocol_stats_mv_protocol
    ON socksproxies.protocol_stats_mv(protocol);

-- ============================================================================
-- MATERIALIZED VIEW FOR COUNTRY STATS
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS socksproxies.country_stats_mv AS
SELECT
    UPPER(country_code) as country_code,
    country_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE socks5 = 1) as socks5_count,
    COUNT(*) FILTER (WHERE http = 1) as http_count,
    COUNT(*) FILTER (WHERE ssl = 1) as https_count,
    COUNT(*) FILTER (WHERE socks4 = 1) as socks4_count,
    AVG(delay) as avg_delay,
    MAX(last_seen) as last_seen,
    NOW() as last_updated
FROM socksproxies.proxy_list
WHERE country_code IS NOT NULL AND country_code != ''
GROUP BY country_code, country_name
ORDER BY total_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_country_stats_mv_code
    ON socksproxies.country_stats_mv(country_code);

-- ============================================================================
-- MATERIALIZED VIEW FOR TOP PORTS
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS socksproxies.port_stats_mv AS
SELECT
    port as port,
    COUNT(*) as total_count,
    AVG(delay) as avg_delay,
    NOW() as last_updated
FROM socksproxies.proxy_list
GROUP BY port
ORDER BY total_count DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_port_stats_mv_port
    ON socksproxies.port_stats_mv(port);

-- ============================================================================
-- MATERIALIZED VIEW FOR TOP ASNs
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS socksproxies.asn_stats_mv AS
SELECT
    asn as asn,
    asn_name as name,
    org as org,
    COUNT(*) as total_count,
    COUNT(DISTINCT country_code) as countries_count,
    AVG(delay) as avg_delay,
    NOW() as last_updated
FROM socksproxies.proxy_list
WHERE asn IS NOT NULL AND asn > 0
GROUP BY asn, asn_name, org
ORDER BY total_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_asn_stats_mv_asn
    ON socksproxies.asn_stats_mv(asn);

-- ============================================================================
-- PARTIAL INDEX FOR RECENT PROXIES (last 7 days)
-- ============================================================================

-- This index is smaller and covers most "recent proxy" queries
CREATE INDEX IF NOT EXISTS idx_proxy_list_recent
    ON socksproxies.proxy_list(last_seen DESC, delay)
    WHERE last_seen > NOW() - INTERVAL '7 days';

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON MATERIALIZED VIEW socksproxies.proxy_stats_mv IS
    'Pre-computed proxy statistics for fast dashboard queries. Refresh via REFRESH MATERIALIZED VIEW CONCURRENTLY.';

COMMENT ON MATERIALIZED VIEW socksproxies.protocol_stats_mv IS
    'Pre-computed protocol statistics. Refresh via REFRESH MATERIALIZED VIEW CONCURRENTLY.';

COMMENT ON MATERIALIZED VIEW socksproxies.country_stats_mv IS
    'Pre-computed country-level statistics. Refresh via REFRESH MATERIALIZED VIEW CONCURRENTLY.';

COMMENT ON MATERIALIZED VIEW socksproxies.port_stats_mv IS
    'Pre-computed port statistics (top 100). Refresh via REFRESH MATERIALIZED VIEW CONCURRENTLY.';

COMMENT ON MATERIALIZED VIEW socksproxies.asn_stats_mv IS
    'Pre-computed ASN statistics. Refresh via REFRESH MATERIALIZED VIEW CONCURRENTLY.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON ALL TABLES IN SCHEMA socksproxies TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- ANALYZE
-- ============================================================================

ANALYZE socksproxies.proxy_stats_mv;
ANALYZE socksproxies.protocol_stats_mv;
ANALYZE socksproxies.country_stats_mv;
ANALYZE socksproxies.port_stats_mv;
ANALYZE socksproxies.asn_stats_mv;
