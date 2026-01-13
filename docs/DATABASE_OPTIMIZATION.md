# Database Optimization Analysis and Recommendations

## Executive Summary

This document outlines the database performance analysis and optimization strategies implemented for `socks5proxies.com`.

## 1. Current Query Patterns Analysis

### 1.1 Common Filter Queries

| Query Pattern                                                   | Frequency | Current Index                               |
| --------------------------------------------------------------- | --------- | ------------------------------------------- |
| `WHERE socks5 = 1 AND country_code = ? ORDER BY last_seen DESC` | High      | `idx_proxy_list_protocol_country` (partial) |
| `WHERE country_code = ? AND port = ? ORDER BY last_seen DESC`   | High      | `idx_proxy_list_country_port` (exists)      |
| `WHERE asn = ? AND country_code = ?`                            | Medium    | `idx_proxy_list_asn_country` (exists)       |
| `WHERE LOWER(city) = LOWER(?)`                                  | Low       | None (slow)                                 |
| `ORDER BY RANDOM()`                                             | Medium    | None (very slow)                            |

### 1.2 Identified Issues

#### Issue 1: N+1 Query Problem in `RebuildProxyFacets`

- **Location**: `proxy_list.go:450-733`
- **Problem**: Multiple separate GROUP BY queries (6+ sequential queries)
- **Impact**: High latency during facet rebuild (~500ms-2s depending on data size)

#### Issue 2: Random Query Performance

- **Location**: `ListRandomProxies()`
- **Problem**: `ORDER BY RANDOM()` requires full table scan
- **Impact**: Slow on large tables (>100k rows)

#### Issue 3: Stats Query Overhead

- **Location**: `GetProxyStats()`
- **Problem**: Multiple aggregations on every request
- **Impact**: Dashboard load time increases with data size

#### Issue 4: Case-Insensitive Searches

- **Location**: `buildProxyListWhere()` for city/region filters
- **Problem**: `LOWER()` function calls prevent index usage
- **Impact**: Full table scan for city/region filters

## 2. Index Optimization Strategy

### 2.1 Compound Indexes for Common Filters

```sql
-- Protocol + Country with ordering
CREATE INDEX idx_proxy_list_socks5_country_last_seen
    ON proxy_list(socks5, country_code, last_seen DESC)
    WHERE socks5 = 1;

-- Country + Port with ordering
CREATE INDEX idx_proxy_list_country_port_last_seen
    ON proxy_list(country_code, port, last_seen DESC);
```

### 2.2 Partial Indexes for Protocol Filters

Partial indexes are smaller and faster for queries that filter on boolean protocol columns:

```sql
CREATE INDEX idx_proxy_list_socks5_active
    ON proxy_list(last_seen DESC, delay)
    WHERE socks5 = 1;
```

### 2.3 Covering Index for Stats

```sql
CREATE INDEX idx_proxy_list_stats_covering
    ON proxy_list(id)
    INCLUDE (country_code, checks_up, checks_down, http, ssl, socks4, socks5);
```

### 2.4 Case-Insensitive Search Support

```sql
CREATE INDEX idx_proxy_list_city_lower
    ON proxy_list(LOWER(city), country_code);
```

## 3. Query Optimization Techniques

### 3.1 Single-Query Facet Rebuild

**Before** (6 sequential queries):

```go
// 6 separate SelectContext calls
s.DB.SelectContext(ctx, &countryRows, "SELECT country_code ...")
s.DB.SelectContext(ctx, &portRows, "SELECT port ...")
// ... 4 more queries
```

**After** (1 CTE-based query):

```sql
WITH country_facets AS (...),
     port_facets AS (...),
     ...
SELECT * FROM country_facets
UNION ALL SELECT * FROM port_facets
...
```

**Benefit**: Reduces round trips from 6 to 1, allows PostgreSQL to optimize execution plan.

### 3.2 Seek-Based Pagination

**Before** (OFFSET-based):

```sql
SELECT ... ORDER BY last_seen DESC LIMIT 25 OFFSET 1000;
-- Gets slower as offset increases
```

**After** (seek-based):

```sql
SELECT ... WHERE (last_seen < ? OR (last_seen = ? AND id < ?))
ORDER BY last_seen DESC, id DESC LIMIT 25;
-- Consistent performance regardless of page
```

### 3.3 Materialized Views for Stats

Create pre-computed aggregates:

```sql
CREATE MATERIALIZED VIEW proxy_stats_mv AS
SELECT COUNT(*), SUM(checks_up), ...
FROM proxy_list;

-- Refresh periodically (cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY proxy_stats_mv;
```

## 4. Migration Scripts

### 4.1 Performance Indexes (004)

File: `migrations/004_performance_indexes.up.sql`

**Key indexes**:

- `idx_proxy_list_socks5_country_last_seen` - SOCKS5 + country queries
- `idx_proxy_list_http_country_last_seen` - HTTP + country queries
- `idx_proxy_list_ssl_country_last_seen` - HTTPS + country queries
- `idx_proxy_list_socks4_country_last_seen` - Socks4 + country queries
- `idx_proxy_list_*_active` - Partial indexes for active proxies
- `idx_proxy_list_stats_covering` - Covering index for stats

### 4.2 Materialized Views (005)

File: `migrations/005_materialized_views.up.sql`

**Views**:

- `proxy_stats_mv` - Global statistics
- `protocol_stats_mv` - Protocol counts
- `country_stats_mv` - Per-country stats
- `port_stats_mv` - Top 100 ports
- `asn_stats_mv` - ASN statistics

## 5. Optimized Functions

File: `internal/store/proxy_list_optimized.go`

### 5.1 RebuildProxyFacetsOptimized

- Single CTE-based query instead of 6 separate queries
- Uses `TRUNCATE` + batch insert for faster rebuild
- Estimated speedup: 3-5x

### 5.2 GetASNDetailsOptimized

- Uses JSON aggregation for countries
- Single query with CTEs instead of 3 separate queries
- Estimated speedup: 2-3x

### 5.3 ListRandomProxiesOptimized

- Uses `TABLESAMPLE SYSTEM(1)` for efficient random sampling
- Falls back to regular query if sample is too small
- Estimated speedup: 10-100x on large tables

## 6. Refresh Strategy for Materialized Views

Materialized views need periodic refresh. Recommended approach:

### Option 1: Cron Job (Production)

```yaml
# Add to deployment
cron:
  - name: "Refresh proxy stats"
    schedule: "*/5 * * * *" # Every 5 minutes
    command: |
      psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY socksproxies.proxy_stats_mv;"
      psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY socksproxies.protocol_stats_mv;"
      psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY socksproxies.country_stats_mv;"
      psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY socksproxies.port_stats_mv;"
      psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY socksproxies.asn_stats_mv;"
```

### Option 2: Application-Level Refresh

Add to `internal/proxylist/sync.go`:

```go
// After proxy list sync completes
func RefreshMaterializedViews(ctx context.Context, store *store.PostgresStore) error {
    return store.RefreshProxyStats(ctx)
}
```

## 7. Deployment Steps

1. **Apply migrations in order**:

   ```bash
   psql $DATABASE_URL -f migrations/004_performance_indexes.up.sql
   psql $DATABASE_URL -f migrations/005_materialized_views.up.sql
   ```

2. **Verify indexes created**:

   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE schemaname = 'socksproxies'
   ORDER BY indexname;
   ```

3. **Analyze tables**:

   ```sql
   ANALYZE socksproxies.proxy_list;
   ANALYZE socksproxies.facets;
   ```

4. **Set up refresh schedule** (see Section 6)

## 8. Monitoring Queries

### 8.1 Check Index Usage

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'socksproxies'
ORDER BY idx_scan DESC;
```

### 8.2 Find Missing Indexes

```sql
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / GREATEST(seq_scan, 1) as avg_seq_tup_per_scan
FROM pg_stat_user_tables
WHERE schemaname = 'socksproxies'
    AND seq_scan > 100
    AND seq_tup_read / GREATEST(seq_scan, 1) > 1000
ORDER BY seq_tup_read DESC;
```

### 8.3 Slow Query Log

Enable in `postgresql.conf`:

```conf
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
log_min_duration_statement = 100  # Log queries > 100ms
```

## 9. Expected Performance Improvements

| Operation                      | Before  | After  | Improvement |
| ------------------------------ | ------- | ------ | ----------- |
| Protocol + Country filter      | ~200ms  | ~20ms  | 10x         |
| Random proxies (100 rows)      | ~500ms  | ~50ms  | 10x         |
| Facet rebuild                  | ~2000ms | ~400ms | 5x          |
| Stats query                    | ~100ms  | ~5ms   | 20x         |
| ASN details                    | ~150ms  | ~50ms  | 3x          |
| City filter (case-insensitive) | ~500ms  | ~30ms  | 16x         |

## 10. Future Optimization Opportunities

1. **Partitioning**: Consider partitioning `proxy_list` by `last_seen` date for data older than 30 days
2. **Connection Pooling**: Verify pgxpool settings match expected concurrency
3. **Query Result Caching**: Add Redis caching for frequent queries (stats, facets)
4. **Archival Strategy**: Move old proxy records to archive table
