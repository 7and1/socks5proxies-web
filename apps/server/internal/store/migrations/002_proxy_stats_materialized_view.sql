-- Materialized View for Proxy Statistics
-- File: 002_proxy_stats_materialized_view.sql
-- Description: Pre-computed statistics for fast dashboard/overview queries

-- =============================================================================
-- Materialized View for Proxy Stats
-- =============================================================================

-- Create materialized view for cached statistics
-- This avoids expensive COUNT/SUM queries on the main proxy_list table
CREATE MATERIALIZED VIEW IF NOT EXISTS "{{schema}}".proxy_stats_mv AS
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
FROM "{{schema}}".proxy_list;

-- Create unique index on materialized view (required for REFRESH CONCURRENTLY)
CREATE UNIQUE INDEX IF NOT EXISTS idx_proxy_stats_mv_singleton
    ON "{{schema}}".proxy_stats_mv((total IS NOT NULL));

-- =============================================================================
-- Refresh Function
-- =============================================================================

-- Function to refresh the materialized view concurrently
-- This allows queries to continue using the MV while it refreshes
CREATE OR REPLACE FUNCTION "{{schema}}".refresh_proxy_stats_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY "{{schema}}".proxy_stats_mv;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Trigger for Automatic Refresh (Optional)
-- =============================================================================

-- Create a trigger function to refresh stats after significant changes
-- Note: Only enable this if stats need to be real-time accurate
-- Otherwise, refresh on a schedule (e.g., every 5 minutes via cron)

/*
CREATE OR REPLACE FUNCTION "{{schema}}".trigger_refresh_proxy_stats()
RETURNS trigger AS $$
BEGIN
    -- Only refresh every 5 minutes to avoid excessive refreshes
    -- Check last refresh time from a dedicated table
    PERFORM pg_notify('proxy_stats_refresh', '');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (commented out - enable if needed)
-- CREATE TRIGGER proxy_list_stats_trigger
--     AFTER INSERT OR UPDATE ON "{{schema}}".proxy_list
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION "{{schema}}".trigger_refresh_proxy_stats();
*/

-- =============================================================================
-- Usage
-- =============================================================================

-- Manual refresh:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY "{{schema}}".proxy_stats_mv;
--
-- Or via function:
-- SELECT "{{schema}}".refresh_proxy_stats_mv();
--
-- Scheduled refresh (cron example):
-- */5 * * * * psql -c "SELECT socksproxies.refresh_proxy_stats_mv();" > /dev/null 2>&1

-- Query the stats:
-- SELECT * FROM "{{schema}}".proxy_stats_mv;

-- Check last refresh time:
-- SELECT last_updated, NOW() - last_updated as age FROM "{{schema}}".proxy_stats_mv;
