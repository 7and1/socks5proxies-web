-- Socks5Proxies Performance Optimization Indexes
-- Version: 004
-- Purpose: Optimize query performance for common filter patterns

-- ============================================================================
-- COMPOUND INDEXES FOR COMMON FILTER COMBINATIONS
-- ============================================================================

-- Index for protocol + country queries with ORDER BY last_seen DESC
-- Covers: SELECT * FROM proxy_list WHERE socks5 = true AND country_code = ? ORDER BY last_seen DESC
CREATE INDEX IF NOT EXISTS idx_proxy_list_socks5_country_last_seen
    ON socksproxies.proxy_list(socks5, country_code, last_seen DESC)
    WHERE socks5 = 1 AND country_code IS NOT NULL AND country_code != '';

-- Index for HTTP protocol + country queries
CREATE INDEX IF NOT EXISTS idx_proxy_list_http_country_last_seen
    ON socksproxies.proxy_list(http, country_code, last_seen DESC)
    WHERE http = 1 AND country_code IS NOT NULL AND country_code != '';

-- Index for HTTPS (ssl) protocol + country queries
CREATE INDEX IF NOT EXISTS idx_proxy_list_ssl_country_last_seen
    ON socksproxies.proxy_list(ssl, country_code, last_seen DESC)
    WHERE ssl = 1 AND country_code IS NOT NULL AND country_code != '';

-- Index for Socks4 protocol + country queries
CREATE INDEX IF NOT EXISTS idx_proxy_list_socks4_country_last_seen
    ON socksproxies.proxy_list(socks4, country_code, last_seen DESC)
    WHERE socks4 = 1 AND country_code IS NOT NULL AND country_code != '';

-- ============================================================================
-- OPTIMIZED INDEXES FOR THREE-COLUMN FILTERS
-- ============================================================================

-- Index for country + port queries with ORDER BY last_seen DESC
-- Covers: SELECT * FROM proxy_list WHERE country_code = ? AND port = ? ORDER BY last_seen DESC
CREATE INDEX IF NOT EXISTS idx_proxy_list_country_port_last_seen
    ON socksproxies.proxy_list(country_code, port, last_seen DESC)
    WHERE country_code IS NOT NULL AND country_code != '';

-- Index for ASN + country queries
-- Covers: SELECT * FROM proxy_list WHERE asn = ? AND country_code = ?
CREATE INDEX IF NOT EXISTS idx_proxy_list_asn_country
    ON socksproxies.proxy_list(asn, country_code)
    WHERE asn IS NOT NULL AND asn > 0;

-- ============================================================================
-- PARTIAL INDEXES FOR PROTOCOL FILTERS
-- ============================================================================

-- Partial index for active SOCKS5 proxies only
-- Smaller index, faster lookups for protocol-specific queries
CREATE INDEX IF NOT EXISTS idx_proxy_list_socks5_active
    ON socksproxies.proxy_list(last_seen DESC, delay)
    WHERE socks5 = 1;

CREATE INDEX IF NOT EXISTS idx_proxy_list_http_active
    ON socksproxies.proxy_list(last_seen DESC, delay)
    WHERE http = 1;

CREATE INDEX IF NOT EXISTS idx_proxy_list_ssl_active
    ON socksproxies.proxy_list(last_seen DESC, delay)
    WHERE ssl = 1;

CREATE INDEX IF NOT EXISTS idx_proxy_list_socks4_active
    ON socksproxies.proxy_list(last_seen DESC, delay)
    WHERE socks4 = 1;

-- ============================================================================
-- INDEXES FOR ANONYMITY LEVEL FILTERS
-- ============================================================================

-- Index for elite/anonymous anonymity queries
CREATE INDEX IF NOT EXISTS idx_proxy_list_anon_levels
    ON socksproxies.proxy_list(anon, last_seen DESC)
    WHERE anon IS NOT NULL;

-- ============================================================================
-- COVERING INDEX FOR STATS QUERIES
-- ============================================================================

-- Covering index for GetProxyStats query (includes all columns needed)
-- Covers: SELECT COUNT(*), COUNT(DISTINCT country_code), SUM(checks_up), SUM(checks_down), ...
CREATE INDEX IF NOT EXISTS idx_proxy_list_stats_covering
    ON socksproxies.proxy_list(id)
    INCLUDE (country_code, checks_up, checks_down, http, ssl, socks4, socks5);

-- ============================================================================
-- INDEXES FOR FACETS REBUILD (GROUP BY QUERIES)
-- ============================================================================

-- Index for country facet aggregation
CREATE INDEX IF NOT EXISTS idx_proxy_list_country_facet
    ON socksproxies.proxy_list(country_code, country_name, delay)
    WHERE country_code IS NOT NULL AND country_code != '';

-- Index for city facet aggregation
CREATE INDEX IF NOT EXISTS idx_proxy_list_city_facet
    ON socksproxies.proxy_list(city, country_code, country_name, delay)
    WHERE city IS NOT NULL AND city != '';

-- Index for region facet aggregation
CREATE INDEX IF NOT EXISTS idx_proxy_list_region_facet
    ON socksproxies.proxy_list(region, country_code, country_name, delay)
    WHERE region IS NOT NULL AND region != '';

-- Index for ASN facet aggregation
CREATE INDEX IF NOT EXISTS idx_proxy_list_asn_facet
    ON socksproxies.proxy_list(asn, asn_name, org, delay)
    WHERE asn IS NOT NULL AND asn > 0;

-- ============================================================================
-- INDEXES FOR RANDOM PROXY SELECTION
-- ============================================================================

-- Create a specialized index for random sampling using TABLESAMPLE
CREATE INDEX IF NOT EXISTS idx_proxy_list_random_sample
    ON socksproxies.proxy_list(id, last_seen)
    WHERE last_seen > NOW() - INTERVAL '7 days';

-- ============================================================================
-- CITY AND REGION LOWERCASE SEARCH SUPPORT
-- ============================================================================

-- Index for case-insensitive city searches (LOWER() function support)
-- Uses the (country_code, city) pattern from RebuildProxyFacets
CREATE INDEX IF NOT EXISTS idx_proxy_list_city_lower
    ON socksproxies.proxy_list(LOWER(city), country_code)
    WHERE city IS NOT NULL AND city != '';

CREATE INDEX IF NOT EXISTS idx_proxy_list_region_lower
    ON socksproxies.proxy_list(LOWER(region), country_code)
    WHERE region IS NOT NULL AND region != '';

-- ============================================================================
-- IP + PORT CONFLICT INDEX (upsert optimization)
-- ============================================================================

-- Already covered by UNIQUE(ip, port) constraint
-- But ensure B-tree is optimal for lookups
-- (PostgreSQL automatically creates index for UNIQUE constraints)

-- ============================================================================
-- COMMENT ON INDEXES (documentation)
-- ============================================================================

COMMENT ON INDEX socksproxies.idx_proxy_list_socks5_country_last_seen IS
    'Optimized index for SOCKS5 + country filter queries with last_seen ordering';

COMMENT ON INDEX socksproxies.idx_proxy_list_country_port_last_seen IS
    'Optimized index for country + port filter queries with last_seen ordering';

COMMENT ON INDEX socksproxies.idx_proxy_list_stats_covering IS
    'Covering index for GetProxyStats aggregate query - avoids table lookups';

COMMENT ON INDEX socksproxies.idx_proxy_list_socks5_active IS
    'Partial index for active SOCKS5 proxies only - smaller and faster';

-- ============================================================================
-- ANALYZE TABLES AFTER INDEX CREATION
-- ============================================================================

ANALYZE socksproxies.proxy_list;
ANALYZE socksproxies.facets;
