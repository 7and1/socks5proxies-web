# SOCKS5 Proxies - Production Deployment Guide

## Overview

This is a monorepo containing a Next.js frontend (web) and a Go API backend (server) with Redis caching.

```
socks5proxies.com/
├── apps/
│   ├── web/          # Next.js 14 frontend (port 3000)
│   └── server/       # Go 1.24 API backend (port 8080)
├── data/             # Bind mount volumes
├── deploy/
│   └── nginx/        # Nginx configuration
├── docker-compose.yml
└── Makefile
```

## Prerequisites

- Docker & Docker Compose
- nginx-proxy (already running on server)
- Supabase (optional, for PostgreSQL)

## Quick Deploy

```bash
# 1. Set up environment
cp .env.production.example .env.production
# Edit .env.production with your values

# 2. Build and start
make deploy

# 3. Check health
make health
```

## Deployment Steps

### 1. Check Port Availability

```bash
ssh root@107.174.42.198 "ss -tlnp | grep -E '3000|8080'"
```

### 2. Sync Code to Server

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next' \
  /Volumes/SSD/skills/server-ops/vps/107.174.42.198/heavy-tasks/socks5proxies.com/ \
  root@107.174.42.198:/opt/docker-projects/heavy-tasks/socks5proxies.com/
```

### 3. Deploy Nginx Configuration

```bash
# Copy nginx config to nginx-proxy
scp deploy/nginx/socks5proxies.com.conf \
  root@107.174.42.198:/opt/docker-projects/nginx-proxy/config/conf.d/

# Reload nginx
ssh root@107.174.42.198 "docker restart nginx-proxy"
```

### 4. Start Services

```bash
ssh root@107.174.42.198
cd /opt/docker-projects/heavy-tasks/socks5proxies.com
make deploy
```

### 5. Verify Deployment

```bash
# Check container status
docker-compose ps

# Check health endpoints
curl http://localhost:3000/api/health
curl http://localhost:8080/api/health

# View logs
make logs
```

## Makefile Commands

| Command         | Description                       |
| --------------- | --------------------------------- |
| `make deploy`   | Build and start all containers    |
| `make build`    | Build containers without starting |
| `make up`       | Start containers (no rebuild)     |
| `make down`     | Stop and remove containers        |
| `make restart`  | Restart all containers            |
| `make logs`     | Show logs from all containers     |
| `make health`   | Check health of all services      |
| `make validate` | Validate Docker configuration     |

## Environment Variables

See `.env.production.example` for all available variables.

Key variables:

- `NEXT_PUBLIC_API_URL` - Public API URL for clients
- `NEXT_PUBLIC_WS_URL` - WebSocket URL
- `REDIS_ADDR` - Redis server address
- `RATE_LIMIT_PER_DAY` - Free tier rate limit

## Networks

Services connect to:

- `internal` - Internal communication
- `nginx-proxy_default` - Public access via nginx
- `supabase_default` - Database access (optional)

## Data Persistence

Bind mounts (not volumes):

- `./data/api` - SQLite database and GeoIP
- `./data/redis` - Redis persistence
- `./data/web` - Next.js cache (if needed)

## Monitoring

- Logs: `make logs`
- Health: `make health`
- Uptime: Check uptime.expertbeacon.com
- Metrics: Available via /api/health endpoints

## Troubleshooting

```bash
# Check container status
docker-compose ps

# View specific service logs
make logs-api
make logs-web
make logs-redis

# Restart a specific service
docker-compose restart api

# Rebuild after code changes
make deploy

# Check nginx config
docker exec nginx-proxy nginx -t
```

## Security Notes

- All services bind to 127.0.0.1 (not exposed publicly)
- Public access via nginx-proxy only
- Rate limiting configured in nginx
- Non-root users in all containers
- Health checks for all services
