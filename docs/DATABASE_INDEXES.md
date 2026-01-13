# Database Indexes Documentation

## Overview

This document describes the database indexes created for `socks5proxies.com` to optimize query performance based on the application's query patterns.

## Index Files

| File                                    | Purpose                                  |
| --------------------------------------- | ---------------------------------------- |
| `001_proxy_list_indexes.sql`            | Core indexes for proxy_list table        |
| `002_proxy_stats_materialized_view.sql` | Materialized view for fast stats queries |

## Query Pattern Analysis

### Common Query Patterns

1. **Country-specific SOCKS5 proxies**

   ```sql
   WHERE socks5 = 1 AND country_code = ? ORDER BY last_seen DESC
   ```

   Index: `idx_proxy_list_socks5_country_last_seen`

2. **Country + Port filtering**

   ```sql
   WHERE country_code = ? AND port = ? ORDER BY last_seen DESC
   ```

   Index: `idx_proxy_list_country_port_last_seen`

3. **ASN details query**

   ```sql
   WHERE asn = ? AND country_code IS NOT NULL
   ```

   Index: `idx_proxy_list_asn_country`

4. **City filtering**

   ```sql
   WHERE country_code = ? AND LOWER(city) = ?
   ```

   Index: `idx_proxy_list_country_city`

5. **Protocol filtering**
   ```sql
   WHERE http = 1 OR ssl = 1 OR socks4 = 1 OR socks5 = 1
   ```
   Index: `idx_proxy_list_protocol_flags`

## Index Categories

### Single Column Indexes

| Index                         | Columns          | Condition       | Purpose             |
| ----------------------------- | ---------------- | --------------- | ------------------- |
| `idx_proxy_list_last_seen`    | `last_seen DESC` | -               | ORDER BY clauses    |
| `idx_proxy_list_country_code` | `country_code`   | NOT NULL, != '' | Country filtering   |
| `idx_proxy_list_port`         | `port`           | > 0             | Port filtering      |
| `idx_proxy_list_asn`          | `asn`            | NOT NULL, > 0   | ASN filtering       |
| `idx_proxy_list_city`         | `LOWER(city)`    | NOT NULL, != '' | City filtering      |
| `idx_proxy_list_region`       | `LOWER(region)`  | NOT NULL, != '' | Region filtering    |
| `idx_proxy_list_anon`         | `anon`           | > 0             | Anonymity filtering |
| `idx_proxy_list_delay`        | `delay`          | NOT NULL, > 0   | Latency filtering   |

### Partial Indexes (Protocol-specific)

| Index                          | Condition          | Purpose              |
| ------------------------------ | ------------------ | -------------------- |
| `idx_proxy_list_socks5_active` | `WHERE socks5 = 1` | SOCKS5 proxy queries |
| `idx_proxy_list_http_active`   | `WHERE http = 1`   | HTTP proxy queries   |
| `idx_proxy_list_ssl_active`    | `WHERE ssl = 1`    | HTTPS proxy queries  |
| `idx_proxy_list_socks4_active` | `WHERE socks4 = 1` | SOCKS4 proxy queries |

### Composite Indexes

| Index                                     | Columns                                | Condition    | Use Case               |
| ----------------------------------------- | -------------------------------------- | ------------ | ---------------------- |
| `idx_proxy_list_socks5_country_last_seen` | `(country_code, last_seen DESC)`       | `socks5 = 1` | Country SOCKS5 pages   |
| `idx_proxy_list_country_port_last_seen`   | `(country_code, port, last_seen DESC)` | NOT NULL     | Country + port filter  |
| `idx_proxy_list_asn_country`              | `(asn, country_code)`                  | `asn > 0`    | ASN details page       |
| `idx_proxy_list_country_city`             | `(country_code, LOWER(city))`          | NOT NULL     | City-based filtering   |
| `idx_proxy_list_country_region`           | `(country_code, LOWER(region))`        | NOT NULL     | Region-based filtering |
| `idx_proxy_list_protocol_flags`           | `(http, ssl, socks4, socks5)`          | Any active   | Multi-protocol queries |

### Facets Table Indexes

| Index                     | Columns                   | Purpose         |
| ------------------------- | ------------------------- | --------------- | --------------------------- |
| `idx_facets_type_count`   | `(type, count DESC, key)` | `count > 0`     | Facet listing with ordering |
| `idx_facets_type_updated` | `(type, updated_at DESC)` | Update tracking | Facet refresh queries       |

## Materialized View

### `proxy_stats_mv`

Pre-computed statistics for dashboard/overview queries.

**Columns:**

- `total` - Total proxy count
- `countries` - Number of distinct countries
- `checks_up`, `checks_down` - Check counts for uptime calculation
- `http`, `https`, `socks4`, `socks5` - Protocol counts
- `last_updated` - Timestamp of last refresh

**Refresh:**

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY "schema".proxy_stats_mv;
```

## Usage in Go Code

### Running Migrations

```go
import "socksproxies.com/server/internal/store/migrations"

// Create migrator
migrator := migrations.NewMigrator(dbPool, schemaName)

// Run all pending migrations
if err := migrator.Run(ctx); err != nil {
    log.Fatal(err)
}
```

### Creating Indexes Directly

```go
// Create all proxy_list indexes
if err := migrations.CreateProxyListIndexes(ctx, dbPool, schemaName); err != nil {
    log.Fatal(err)
}
```

### Refreshing Materialized View

```go
// Refresh stats MV
migrator := migrations.NewMigrator(dbPool, schemaName)
if err := migrator.RefreshMaterializedView(ctx); err != nil {
    log.Fatal(err)
}
```

### Getting Index Statistics

```go
// Get index usage stats
stats, err := migrator.GetIndexStats(ctx)
for _, stat := range stats {
    fmt.Printf("%s: %d scans, size %s\n", stat.Name, stat.ScanCount, stat.IndexSize)
}
```

### Analyzing Table Statistics

```go
// Update query planner statistics after bulk operations
if err := migrations.AnalyzeTableStatistics(ctx, dbPool, schemaName); err != nil {
    log.Fatal(err)
}
```

## Monitoring Index Usage

### Check Index Usage

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'your_schema'
ORDER BY idx_scan DESC;
```

### Find Unused Indexes

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'your_schema'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY size DESC;
```

### Check Index Size

```sql
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size,
    pg_size_pretty(pg_relation_size(indrelid)) as table_size
FROM pg_index
JOIN pg_class ON pg_class.oid = indexrelid
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE pg_namespace.nspname = 'your_schema'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Partial Index Benefits

Partial indexes (with WHERE clause) provide:

1. **Smaller size** - Only index rows that match the condition
2. **Faster writes** - Fewer index updates on INSERT/UPDATE
3. **Better selectivity** - Index only contains relevant rows

Example:

```sql
-- Only indexes active SOCKS5 proxies (~10% of table)
CREATE INDEX idx_proxy_list_socks5_active
    ON proxy_list(last_seen DESC)
    WHERE socks5 = 1;
```

## Maintenance Recommendations

### Daily

- Refresh materialized view: `REFRESH MATERIALIZED VIEW CONCURRENTLY proxy_stats_mv`
- Run `ANALYZE` after bulk data updates

### Weekly

- Review index usage statistics
- Identify and drop unused indexes (after 30 days of no usage)

### On Bulk Operations

- Run `ANALYZE` after large batch inserts
- Consider dropping indexes before massive bulk loads, recreate after

## Index Naming Convention

- `idx_<table>_<columns>` - Standard index
- `idx_<table>_<purpose>` - Purpose-specific index
- `idx_<table>_<columns>_<condition>` - Partial index (condition in WHERE)

## Deployment

1. Apply migrations via application startup or dedicated migration tool
2. Run `ANALYZE` after index creation
3. Refresh materialized view
4. Monitor query performance via `pg_stat_statements`
