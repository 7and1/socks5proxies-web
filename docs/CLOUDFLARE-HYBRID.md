# Cloudflare Hybrid Architecture

## Overview

Socks5Proxies.com uses a hybrid architecture leveraging Cloudflare for frontend edge delivery and origin infrastructure for backend services that require raw TCP connections.

```
                     +-------------------+
                     |   Cloudflare CDN  |
                     +-------------------+
                              |
                +-------------+-------------+
                |                           |
        +-------+-------+           +-------+-------+
        | Next.js (Edge) |           |  Workers/     |
        | (Static Pages) |           |  Pages Assets |
        +---------------+           +---------------+
                |                           |
                | API Requests              |
                v                           |
        +-------+---------------------------+
        |           Origin API              |
        |   (Go - Proxy Checking Service)  |
        |   api.socks5proxies.com:8003     |
        +-----------------------------------+
                |
        +-------+--------+ +-------+--------+
        |     Redis      | |  SQLite/PG     |
        +----------------+ +----------------+
```

## Architecture Decisions

### Why Hybrid?

1. **Proxy Checking Requires Raw TCP**: Cloudflare Workers cannot establish direct TCP connections to proxy servers for validation. This functionality must run at origin.

2. **Edge for Static Content**: Next.js static pages are served from Cloudflare's edge for optimal global latency.

3. **API Routes**:
   - GET requests (proxy lists) - Can be cached at edge
   - WebSocket (proxy checking) - Must terminate at origin

## Services

| Service           | Location                 | Purpose                            |
| ----------------- | ------------------------ | ---------------------------------- |
| Next.js Frontend  | Cloudflare Pages/Workers | Static content, SEO pages          |
| Go API            | Origin (VPS)             | Proxy checking, WebSocket endpoint |
| Redis             | Origin (Docker)          | Rate limiting, caching             |
| SQLite/PostgreSQL | Origin (Docker)          | Persistent storage                 |

## Deployment

### Frontend (Cloudflare)

```bash
# Build for Cloudflare
make cf-build

# Deploy to Cloudflare
make cf-deploy

# Or use the deployment script
./deploy/cloudflare-deploy.sh production
```

### Backend (Origin)

```bash
# Standard Docker deployment
make deploy
```

## DNS Configuration

```
socks5proxies.com      -> Cloudflare Proxy (Orange Cloud)
www.socks5proxies.com  -> Cloudflare Proxy (Orange Cloud)
api.socks5proxies.com  -> Origin IP (DNS Only / Grey Cloud)
```

**Important**: The API subdomain should bypass Cloudflare proxy to enable direct WebSocket connections without additional hops.

## Environment Variables

### Cloudflare (Frontend)

- `CLOUDFLARE_ACCOUNT_ID` - Required for Wrangler deployment
- `NEXT_PUBLIC_API_URL` - Origin API URL
- `NEXT_PUBLIC_WS_URL` - WebSocket URL

### Origin (Backend)

- Standard Docker environment variables (see `.env.production.example`)

## Caching Strategy

### Edge Cacheable

- Static pages (SSG)
- Proxy list JSON responses (short TTL)
- Static assets (images, CSS, JS)

### Not Cacheable

- WebSocket connections
- Admin/ authenticated endpoints
- Real-time proxy status

## Monitoring

### Cloudflare

```bash
# Real-time logs
make cf-logs

# Or
wrangler tail --format pretty
```

### Origin

```bash
# Docker logs
make logs-api

# Health check
curl https://api.socks5proxies.com/api/health
```

## Failover

If Cloudflare is down:

1. DNS failover can route directly to origin
2. Origin API remains accessible via `api.socks5proxies.com`

If Origin is down:

1. Cloudflare serves cached static content
2. API returns error pages (configure custom error pages in Cloudflare)

## Security

1. **CORS**: Configure allowed origins in both Cloudflare and origin
2. **Rate Limiting**: Dual-layer (Cloudflare + Redis)
3. **WebSocket**: Origin-only termination, no Cloudflare proxy on API subdomain
4. **Secrets**: Use Cloudflare Secrets API for sensitive data

## Cost Optimization

1. **KV Namespace**: Cache frequently accessed proxy lists
2. **R2 Bucket**: Store static exports and archived data
3. **Workers**: Free tier covers most edge compute needs
4. **Bandwidth**: Cloudflare's generous bandwidth allowance reduces origin costs
