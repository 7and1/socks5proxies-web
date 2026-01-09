# FreeProxyList Integration Plan for Socks5Proxies.com

## Executive Summary

This document outlines the strategy to integrate core features from the `freeproxylist` project into `socks5proxies.com`. The integration will add a comprehensive free proxy listing feature with advanced SEO capabilities while preserving the existing proxy checker tools.

**Source Project:** `/Volumes/SSD/dev/old/freeproxylist` (Next.js 16)
**Target Project:** `/Volumes/SSD/skills/server-ops/vps/107.174.42.198/heavy-tasks/socks5proxies.com` (Monorepo: Next.js 14 + Go)

---

## 1. Project Analysis

### 1.1 FreeProxyList Architecture

| Component  | Technology                            | Description                                 |
| ---------- | ------------------------------------- | ------------------------------------------- |
| Frontend   | Next.js 16, React 18, Tailwind CSS 4  | SSR proxy listing pages                     |
| Data Layer | TypeScript + CSV parsing              | Fetches proxy data from external CSV source |
| Caching    | Custom dual-cache (5min API, 1hr Web) | In-memory caching with TTL                  |
| API        | Next.js API routes                    | Authenticated REST API with rate limiting   |
| Auth       | Bearer token + timing-safe comparison | API key validation with rate limiting       |
| GeoIP      | MaxMind + IP enrichment               | ASN, organization, region data              |
| SEO        | Multi-tier sitemaps, structured data  | Programmatic SEO for 1000s of pages         |

**Key Modules:**

```
freeproxylist/
├── lib/
│   ├── proxy-data.ts        # Core data fetching & caching
│   ├── cache-manager.ts     # Dual-cache architecture
│   ├── auth.ts              # API authentication & rate limiting
│   ├── proxy-constants.ts   # Centralized configuration
│   ├── facets.ts            # Faceted navigation helpers
│   ├── seo-utils.ts         # SEO metadata generation
│   └── structured-data.ts   # JSON-LD schema generation
├── types/proxy.ts           # TypeScript interfaces
├── app/
│   ├── country/[slug]/      # Country listing pages
│   ├── protocol/[slug]/     # Protocol listing pages
│   ├── port/[port]/         # Port listing pages
│   ├── city/[country]/[city]/ # City listing pages
│   ├── asn/[asn]/           # ASN listing pages
│   └── api/v1/proxies/      # Authenticated API
└── components/              # UI components (tables, filters)
```

### 1.2 Socks5Proxies.com Architecture

| Component      | Technology                             | Description                |
| -------------- | -------------------------------------- | -------------------------- |
| Frontend       | Next.js 14, React 18, Tailwind CSS 3.4 | Marketing + tools UI       |
| Backend        | Go (Gin framework)                     | WebSocket proxy checker    |
| Cache          | Redis 7.2                              | Session/rate limit storage |
| Database       | SQLite                                 | Persistent proxy data      |
| Infrastructure | Docker Compose                         | Multi-container deployment |

**Current Structure:**

```
socks5proxies.com/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   └── src/
│   │       ├── app/         # Pages (marketing, tools)
│   │       ├── components/  # UI components
│   │       └── lib/         # Utilities
│   └── server/              # Go backend
│       └── internal/
│           ├── api/         # REST handlers
│           ├── checker/     # Proxy validation logic
│           ├── ws/          # WebSocket handler
│           └── geoip/       # GeoIP lookup
├── docker-compose.yml
└── data/                    # Persistent volumes
```

---

## 2. Feature Mapping

### 2.1 Features to Integrate

| FreeProxyList Feature                     | Priority | Integration Target    | Effort |
| ----------------------------------------- | -------- | --------------------- | ------ |
| Proxy Data Fetching & Caching             | P0       | Go backend            | 3 days |
| Country/Protocol/Port Listing Pages       | P0       | Next.js web           | 5 days |
| Dual-Cache Architecture                   | P0       | Go backend + Redis    | 2 days |
| API v1 with Authentication                | P1       | Go backend            | 3 days |
| Rate Limiting                             | P1       | Go backend (existing) | 1 day  |
| SEO Infrastructure (sitemaps, JSON-LD)    | P1       | Next.js web           | 4 days |
| City/Region/ASN Pages                     | P2       | Next.js web           | 4 days |
| Faceted Navigation                        | P2       | Next.js web           | 2 days |
| IP Enrichment (MaxMind)                   | P2       | Go backend            | 2 days |
| Combination Pages (protocol+country+port) | P3       | Next.js web           | 3 days |

### 2.2 Features to Skip/Defer

| Feature              | Reason                             |
| -------------------- | ---------------------------------- |
| Cloudflare Turnstile | Already have rate limiting         |
| Jest Testing         | Prefer Vitest (already configured) |
| vercel.json cron     | Use server-side scheduler instead  |
| Radix UI components  | Keep existing component library    |

---

## 3. Technical Design

### 3.1 Data Flow Architecture

```
                                 ┌───────────────────┐
                                 │  External CSV     │
                                 │  (Proxy Source)   │
                                 └─────────┬─────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Go Backend (apps/server)                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ Scheduler   │───▶│ ProxyLoader │───▶│ Redis Cache         │ │
│  │ (5min cron) │    │ + Enricher  │    │ - api:proxies (5m)  │ │
│  └─────────────┘    └─────────────┘    │ - web:proxies (1hr) │ │
│                                        └──────────┬──────────┘ │
│                                                   │            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                     REST API                            │  │
│  │  GET /api/proxies          (web cache - public)         │  │
│  │  GET /api/v1/proxies       (api cache - authenticated)  │  │
│  │  GET /api/facets/countries (aggregated data)            │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Frontend (apps/web)                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    New Pages (SSR)                        │  │
│  │  /free-proxy-list           # Main listing                │  │
│  │  /free-proxy-list/[country] # Country pages              │  │
│  │  /free-proxy-list/protocol/[slug] # Protocol pages       │  │
│  │  /free-proxy-list/port/[port]     # Port pages           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Existing Pages                           │  │
│  │  /                   # Marketing home                     │  │
│  │  /bulk-checker       # Proxy checker tool                 │  │
│  │  /ip-score           # IP anonymity scoring               │  │
│  │  /converter          # Format converter                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Database Schema Additions

Add to SQLite database (`apps/server/migrations/`):

```sql
-- Proxy data table
CREATE TABLE IF NOT EXISTS proxies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host TEXT NOT NULL,
    ip TEXT NOT NULL,
    port INTEGER NOT NULL,
    country_code TEXT,
    country_name TEXT,
    city TEXT,
    region TEXT,
    asn INTEGER,
    asn_name TEXT,
    org TEXT,
    continent_code TEXT,
    delay INTEGER DEFAULT 0,
    checks_up INTEGER DEFAULT 0,
    checks_down INTEGER DEFAULT 0,
    anon INTEGER DEFAULT 0,          -- 0-4 anonymity level
    http INTEGER DEFAULT 0,          -- 1 = supports HTTP
    ssl INTEGER DEFAULT 0,           -- 1 = supports HTTPS
    socks4 INTEGER DEFAULT 0,        -- 1 = supports SOCKS4
    socks5 INTEGER DEFAULT 0,        -- 1 = supports SOCKS5
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ip, port)
);

-- Indexes for common queries
CREATE INDEX idx_proxies_country ON proxies(country_code);
CREATE INDEX idx_proxies_protocol ON proxies(http, ssl, socks4, socks5);
CREATE INDEX idx_proxies_port ON proxies(port);
CREATE INDEX idx_proxies_anon ON proxies(anon);
CREATE INDEX idx_proxies_delay ON proxies(delay);

-- Aggregated facets cache (updated on sync)
CREATE TABLE IF NOT EXISTS facets (
    type TEXT NOT NULL,              -- 'country', 'port', 'protocol', 'asn'
    key TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    avg_delay REAL DEFAULT 0,
    metadata TEXT,                   -- JSON for extra info
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (type, key)
);
```

### 3.3 Go Backend Extensions

**New packages to add:**

```
apps/server/internal/
├── proxylist/
│   ├── loader.go       # (existing) CSV loader
│   ├── sync.go         # NEW: Background sync scheduler
│   └── enricher.go     # NEW: IP data enrichment
├── facets/
│   └── facets.go       # NEW: Aggregation logic
└── api/
    ├── proxy_list.go   # NEW: Listing endpoints
    └── auth.go         # NEW: API key authentication
```

**Key additions to `internal/proxylist/sync.go`:**

```go
package proxylist

import (
    "context"
    "time"
)

type SyncConfig struct {
    SourceURL     string
    SyncInterval  time.Duration  // 5 minutes
    WebCacheTTL   time.Duration  // 1 hour
    APICacheTTL   time.Duration  // 5 minutes
}

type Syncer struct {
    config   SyncConfig
    redis    *redis.Client
    db       *sql.DB
    geoip    *geoip.Resolver
}

func (s *Syncer) Start(ctx context.Context) {
    ticker := time.NewTicker(s.config.SyncInterval)
    defer ticker.Stop()

    // Initial sync
    s.sync(ctx)

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            s.sync(ctx)
        }
    }
}

func (s *Syncer) sync(ctx context.Context) error {
    // 1. Fetch CSV from source
    // 2. Parse and validate
    // 3. Enrich with GeoIP data
    // 4. Upsert to SQLite
    // 5. Update Redis caches
    // 6. Recalculate facets
}
```

### 3.4 Next.js Frontend Extensions

**New route structure:**

```
apps/web/src/app/
├── free-proxy-list/
│   ├── page.tsx                      # Main listing
│   ├── layout.tsx                    # Shared layout
│   ├── [country]/
│   │   ├── page.tsx                  # Country listing
│   │   └── [port]/
│   │       └── page.tsx              # Country + Port
│   ├── protocol/
│   │   └── [slug]/
│   │       ├── page.tsx              # Protocol listing
│   │       └── [country]/
│   │           └── page.tsx          # Protocol + Country
│   └── port/
│       └── [port]/
│           └── page.tsx              # Port listing
├── sitemap-proxies.ts                # Dynamic sitemap
└── (marketing)/
    └── page.tsx                      # Update home page
```

**API client additions (`apps/web/src/lib/api-client.ts`):**

```typescript
// Add to existing api-client.ts

export interface ProxyData {
  host: string;
  ip: string;
  port: number;
  delay: number;
  country_code: string;
  country_name: string;
  city?: string;
  region?: string;
  asn?: number;
  asn_name?: string;
  org?: string;
  anon: number;
  http: number;
  ssl: number;
  socks4: number;
  socks5: number;
  protocols: string[];
  anonymity_level: string;
  uptime: number;
}

export interface ProxyListResponse {
  data: ProxyData[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    cached: boolean;
    cache_age: number;
  };
}

export interface FacetItem {
  key: string;
  count: number;
  avg_delay?: number;
}

export async function getProxyList(params?: {
  country?: string;
  protocol?: string;
  port?: number;
  anonymity?: string;
  limit?: number;
  offset?: number;
}): Promise<ProxyListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.country) searchParams.set("country", params.country);
  if (params?.protocol) searchParams.set("protocol", params.protocol);
  if (params?.port) searchParams.set("port", String(params.port));
  if (params?.anonymity) searchParams.set("anonymity", params.anonymity);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const res = await fetch(`${API_BASE}/api/proxies?${searchParams}`);
  return res.json();
}

export async function getFacets(
  type: "countries" | "ports" | "protocols",
): Promise<FacetItem[]> {
  const res = await fetch(`${API_BASE}/api/facets/${type}`);
  return res.json();
}
```

### 3.5 Configuration Constants

Create `apps/web/src/config/proxy-constants.ts`:

```typescript
// Anonymity level mapping
export const ANONYMITY_LEVELS: Record<number, string> = {
  0: "Transparent",
  1: "Transparent",
  2: "Anonymous",
  3: "Anonymous",
  4: "Elite",
  5: "Elite",
};

export const ANONYMITY_GROUPS = {
  elite: [4, 5],
  anonymous: [2, 3],
  transparent: [0, 1],
} as const;

// Protocol configuration
export const PROTOCOLS = [
  { slug: "http", name: "HTTP", key: "http" },
  { slug: "https", name: "HTTPS", key: "ssl" },
  { slug: "socks4", name: "SOCKS4", key: "socks4" },
  { slug: "socks5", name: "SOCKS5", key: "socks5" },
] as const;

// Common ports
export const COMMON_PORTS = [80, 443, 1080, 3128, 4145, 5555, 8080, 9090, 9999];

// Speed thresholds (ms)
export const SPEED_THRESHOLDS = {
  fast: 500,
  medium: 2000,
  slow: 5000,
};

// Pagination
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

// SEO constraints
export const SITEMAP_MAX_URLS = 50000;
export const MIN_PROXIES_FOR_PAGE = 10;
```

---

## 4. Implementation Phases

### Phase 1: Backend Data Layer (Week 1)

**Goals:** Implement proxy data syncing and caching in Go backend.

**Tasks:**

1. **Database Migration** (0.5 days)
   - [ ] Create `proxies` table migration
   - [ ] Create `facets` table migration
   - [ ] Add indexes

2. **Proxy Loader Enhancement** (1 day)
   - [ ] Update CSV parser for all fields
   - [ ] Add validation logic
   - [ ] Implement upsert logic

3. **Background Syncer** (1.5 days)
   - [ ] Create scheduler with configurable interval
   - [ ] Implement dual-cache update (Redis)
   - [ ] Add graceful shutdown handling
   - [ ] Add metrics/logging

4. **Facet Aggregation** (1 day)
   - [ ] Implement country aggregation
   - [ ] Implement port aggregation
   - [ ] Implement protocol aggregation
   - [ ] Cache aggregations in Redis

5. **API Endpoints** (1 day)
   - [ ] `GET /api/proxies` - List with filters
   - [ ] `GET /api/proxies/:id` - Single proxy
   - [ ] `GET /api/facets/countries`
   - [ ] `GET /api/facets/ports`
   - [ ] `GET /api/facets/protocols`

**Deliverables:**

- Working proxy sync every 5 minutes
- Redis caches populated
- REST API returning proxy data

### Phase 2: Frontend Listing Pages (Week 2)

**Goals:** Create proxy listing UI with filtering and pagination.

**Tasks:**

1. **Shared Components** (1 day)
   - [ ] `ProxyTable` - Sortable data table
   - [ ] `ProxyFilters` - Filter sidebar
   - [ ] `FacetLinks` - Navigation links
   - [ ] `ProxyPagination` - Pagination controls

2. **Main Listing Page** (1 day)
   - [ ] `/free-proxy-list/page.tsx`
   - [ ] Server-side data fetching
   - [ ] Filter state management
   - [ ] Table rendering

3. **Country Pages** (1 day)
   - [ ] `/free-proxy-list/[country]/page.tsx`
   - [ ] Dynamic metadata generation
   - [ ] Breadcrumb navigation
   - [ ] Related countries sidebar

4. **Protocol Pages** (0.5 days)
   - [ ] `/free-proxy-list/protocol/[slug]/page.tsx`
   - [ ] Protocol-specific content

5. **Port Pages** (0.5 days)
   - [ ] `/free-proxy-list/port/[port]/page.tsx`
   - [ ] Port-specific content

6. **Navigation Integration** (0.5 days)
   - [ ] Update header navigation
   - [ ] Update footer links
   - [ ] Update home page CTAs

**Deliverables:**

- Functional proxy listing pages
- Client-side filtering and sorting
- SSR for SEO

### Phase 3: SEO Infrastructure (Week 3)

**Goals:** Implement comprehensive SEO for proxy pages.

**Tasks:**

1. **Dynamic Sitemaps** (1 day)
   - [ ] `/sitemap-proxies.ts` - Main proxy sitemap
   - [ ] Country sitemap index
   - [ ] Protocol sitemap index
   - [ ] Update `robots.ts`

2. **Structured Data** (1 day)
   - [ ] Organization JSON-LD
   - [ ] WebSite JSON-LD
   - [ ] Dataset JSON-LD (proxy database)
   - [ ] FAQ JSON-LD

3. **Metadata Generation** (1 day)
   - [ ] Dynamic title/description per page type
   - [ ] OpenGraph images
   - [ ] Canonical URLs
   - [ ] Alternate language tags (if applicable)

4. **Internal Linking** (1 day)
   - [ ] Related countries section
   - [ ] Related protocols section
   - [ ] Cross-linking between pages
   - [ ] Breadcrumb navigation

**Deliverables:**

- Complete sitemap coverage
- Rich snippets in search results
- Proper canonical URLs

### Phase 4: API Authentication (Week 3-4)

**Goals:** Add authenticated API for programmatic access.

**Tasks:**

1. **Auth Middleware** (1 day)
   - [ ] Bearer token extraction
   - [ ] Timing-safe key validation
   - [ ] Rate limit integration

2. **API v1 Endpoints** (1 day)
   - [ ] `GET /api/v1/proxies` (authenticated)
   - [ ] Response format with meta
   - [ ] Query parameter validation

3. **Rate Limiting** (0.5 days)
   - [ ] Per-key rate limits
   - [ ] Rate limit headers
   - [ ] 429 response handling

4. **Documentation** (0.5 days)
   - [ ] API documentation page
   - [ ] Code examples
   - [ ] OpenAPI spec (optional)

**Deliverables:**

- Authenticated API endpoints
- Rate limiting per API key
- Developer documentation

### Phase 5: Advanced Features (Week 4+)

**Goals:** Tier 2 and 3 pages, enhanced functionality.

**Tasks:**

1. **City/Region Pages** (2 days)
   - [ ] `/free-proxy-list/[country]/[city]/page.tsx`
   - [ ] Region aggregation

2. **Combination Pages** (2 days)
   - [ ] Protocol + Country
   - [ ] Country + Port
   - [ ] Protocol + Country + Port

3. **ASN Pages** (1 day)
   - [ ] `/free-proxy-list/asn/[asn]/page.tsx`
   - [ ] ASN metadata display

4. **IP Enrichment Enhancement** (1 day)
   - [ ] MaxMind database integration
   - [ ] ISP/Organization lookup
   - [ ] Threat intelligence (optional)

---

## 5. Code Reuse Analysis

### 5.1 Direct Migration (Copy + Adapt)

| File                     | Source        | Target                                   | Changes Needed      |
| ------------------------ | ------------- | ---------------------------------------- | ------------------- |
| `types/proxy.ts`         | freeproxylist | `apps/web/src/types/proxy.ts`            | Minor adjustments   |
| `lib/proxy-constants.ts` | freeproxylist | `apps/web/src/config/proxy-constants.ts` | Namespace changes   |
| `lib/seo-utils.ts`       | freeproxylist | `apps/web/src/lib/seo.ts`                | Import path updates |
| `lib/structured-data.ts` | freeproxylist | `apps/web/src/lib/structured-data.ts`    | Site config updates |

### 5.2 Rewrite for Go Backend

| Feature           | Source (TS)            | Target (Go)                    | Notes                   |
| ----------------- | ---------------------- | ------------------------------ | ----------------------- |
| CSV parsing       | `lib/proxy-data.ts`    | `internal/proxylist/loader.go` | Already exists, enhance |
| Cache management  | `lib/cache-manager.ts` | Redis commands                 | Use existing Redis      |
| Auth/Rate limit   | `lib/auth.ts`          | `internal/api/auth.go`         | Extend existing         |
| Facet aggregation | `lib/facets.ts`        | `internal/facets/facets.go`    | SQL aggregation         |

### 5.3 UI Components (Adapt to Existing Style)

| Component   | Source                              | Notes                           |
| ----------- | ----------------------------------- | ------------------------------- |
| Proxy table | `components/proxy-table-server.tsx` | Adapt to existing card style    |
| Pagination  | `components/ui/pagination.tsx`      | Merge with existing patterns    |
| Filters     | Custom in freeproxylist             | Create new with existing UI kit |

---

## 6. Risk Assessment

### 6.1 Technical Risks

| Risk                    | Probability | Impact | Mitigation                                       |
| ----------------------- | ----------- | ------ | ------------------------------------------------ |
| Data source unavailable | Medium      | High   | Multiple fallback sources, stale cache serving   |
| Performance degradation | Low         | Medium | Redis caching, pagination limits, CDN            |
| SEO page explosion      | Medium      | Medium | Minimum proxy thresholds, noindex for thin pages |
| API abuse               | Medium      | Low    | Rate limiting, API key requirements              |

### 6.2 Integration Risks

| Risk                       | Probability | Impact | Mitigation                     |
| -------------------------- | ----------- | ------ | ------------------------------ |
| Breaking existing features | Low         | High   | Feature flags, staged rollout  |
| Style inconsistency        | Medium      | Low    | Use existing component library |
| URL structure conflicts    | Low         | Medium | Use `/free-proxy-list/` prefix |

---

## 7. Environment Configuration

### 7.1 New Environment Variables

Add to `.env`:

```bash
# Proxy Data Source
PROXY_SOURCE_URL=https://example.com/proxies.csv
PROXY_SYNC_INTERVAL=5m

# Cache Configuration
PROXY_API_CACHE_TTL=300      # 5 minutes
PROXY_WEB_CACHE_TTL=3600     # 1 hour

# API Authentication
API_KEYS=key1,key2,key3
API_RATE_LIMIT_HOUR=1000

# GeoIP
GEOIP_DB_PATH=/data/GeoLite2-City.mmdb
GEOIP_ASN_DB_PATH=/data/GeoLite2-ASN.mmdb

# SEO
SITE_URL=https://socks5proxies.com
```

### 7.2 Docker Compose Updates

Add volumes and environment to existing `docker-compose.yml`:

```yaml
services:
  api:
    environment:
      # ... existing vars
      - PROXY_SOURCE_URL=${PROXY_SOURCE_URL}
      - PROXY_SYNC_INTERVAL=${PROXY_SYNC_INTERVAL:-5m}
      - PROXY_API_CACHE_TTL=${PROXY_API_CACHE_TTL:-300}
      - PROXY_WEB_CACHE_TTL=${PROXY_WEB_CACHE_TTL:-3600}
      - API_KEYS=${API_KEYS:-}
    volumes:
      - ./data/api:/data
      - ./data/geoip:/geoip:ro # GeoIP databases
```

---

## 8. Testing Strategy

### 8.1 Backend Tests

```go
// internal/proxylist/loader_test.go
func TestParseCSV(t *testing.T) { ... }
func TestValidateProxy(t *testing.T) { ... }

// internal/proxylist/sync_test.go
func TestSyncInterval(t *testing.T) { ... }
func TestCacheUpdate(t *testing.T) { ... }

// internal/api/proxy_list_test.go
func TestListProxiesEndpoint(t *testing.T) { ... }
func TestFilterByCountry(t *testing.T) { ... }
func TestPagination(t *testing.T) { ... }
```

### 8.2 Frontend Tests

```typescript
// apps/web/src/lib/proxy-utils.test.ts
describe('anonymityLabel', () => { ... });
describe('formatDelay', () => { ... });

// apps/web/src/components/ProxyTable.test.tsx
describe('ProxyTable', () => { ... });
```

### 8.3 Integration Tests

```bash
# Test sync pipeline
make test-sync

# Test API endpoints
make test-api

# Test full page render
make test-pages
```

---

## 9. Deployment Plan

### 9.1 Pre-Deployment Checklist

- [ ] All migrations tested locally
- [ ] Environment variables documented
- [ ] GeoIP databases downloaded
- [ ] Proxy source URL verified
- [ ] Rate limits configured
- [ ] Monitoring dashboards ready

### 9.2 Deployment Steps

1. **Database Migration**

   ```bash
   ssh root@107.174.42.198
   cd /opt/docker-projects/heavy-tasks/socks5proxies.com
   docker-compose exec api ./server migrate
   ```

2. **Deploy Backend Changes**

   ```bash
   docker-compose build api
   docker-compose up -d api
   docker-compose logs -f api
   ```

3. **Deploy Frontend Changes**

   ```bash
   # Build and push to registry, or rebuild locally
   docker-compose build web
   docker-compose up -d web
   ```

4. **Verify Deployment**

   ```bash
   # Check health
   curl http://localhost:8003/api/health

   # Check proxy endpoint
   curl http://localhost:8003/api/proxies?limit=5

   # Check facets
   curl http://localhost:8003/api/facets/countries
   ```

5. **Monitor**
   - Check Dozzle for logs
   - Verify Redis cache population
   - Monitor response times

---

## 10. Timeline Summary

| Week     | Phase              | Deliverables                             |
| -------- | ------------------ | ---------------------------------------- |
| Week 1   | Backend Data Layer | Proxy sync, caching, REST API            |
| Week 2   | Frontend Listing   | Main pages, country/protocol/port pages  |
| Week 3   | SEO Infrastructure | Sitemaps, structured data, metadata      |
| Week 3-4 | API Authentication | Authenticated API, rate limiting         |
| Week 4+  | Advanced Features  | City pages, combination pages, ASN pages |

**Total Estimated Effort:** 4-5 weeks (1 developer)

---

## 11. Success Metrics

### 11.1 Technical Metrics

- [ ] Proxy sync runs every 5 minutes without failure
- [ ] API response time < 100ms (cache hit)
- [ ] Cache hit rate > 95%
- [ ] Zero downtime deployment

### 11.2 SEO Metrics (30-day targets)

- [ ] All proxy pages indexed by Google
- [ ] Sitemap submitted and processed
- [ ] No crawl errors in Search Console
- [ ] Rich snippets appearing for main pages

### 11.3 Business Metrics (90-day targets)

- [ ] Organic traffic increase from proxy-related keywords
- [ ] API key sign-ups
- [ ] Cross-promotion to existing tools

---

## Appendix A: File Mapping Reference

| Source File                    | Target Location                                             | Action       |
| ------------------------------ | ----------------------------------------------------------- | ------------ |
| `types/proxy.ts`               | `apps/web/src/types/proxy.ts`                               | Copy + adapt |
| `lib/proxy-constants.ts`       | `apps/web/src/config/proxy-constants.ts`                    | Copy + adapt |
| `lib/seo-utils.ts`             | `apps/web/src/lib/seo.ts`                                   | Copy + adapt |
| `lib/structured-data.ts`       | `apps/web/src/lib/structured-data.ts`                       | Copy + adapt |
| `lib/cache-manager.ts`         | Go + Redis                                                  | Rewrite      |
| `lib/auth.ts`                  | `apps/server/internal/api/auth.go`                          | Rewrite      |
| `lib/proxy-data.ts`            | `apps/server/internal/proxylist/`                           | Rewrite      |
| `lib/facets.ts`                | `apps/server/internal/facets/`                              | Rewrite      |
| `app/country/[slug]/page.tsx`  | `apps/web/src/app/free-proxy-list/[country]/page.tsx`       | Adapt        |
| `app/protocol/[slug]/page.tsx` | `apps/web/src/app/free-proxy-list/protocol/[slug]/page.tsx` | Adapt        |
| `app/port/[port]/page.tsx`     | `apps/web/src/app/free-proxy-list/port/[port]/page.tsx`     | Adapt        |

---

## Appendix B: API Endpoint Specification

### Public Endpoints (Web Cache - 1hr TTL)

```
GET /api/proxies
GET /api/proxies?country=US
GET /api/proxies?protocol=socks5
GET /api/proxies?port=1080
GET /api/proxies?anonymity=elite
GET /api/proxies?limit=50&offset=100

GET /api/facets/countries
GET /api/facets/ports
GET /api/facets/protocols
```

### Authenticated Endpoints (API Cache - 5min TTL)

```
GET /api/v1/proxies
Authorization: Bearer <api_key>

Response Headers:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1698765432
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-07
**Author:** Claude Opus 4.5
