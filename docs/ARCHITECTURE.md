# Socks5Proxies.com Architecture

## Overview

- Frontend: Next.js 14 App Router + Tailwind CSS.
- Backend: Go (Gin) + Gorilla WebSocket.
- Data: SQLite for persistence, Redis for rate limiting and hot cache.
- Real-time: WebSocket for bulk proxy checking.

## Key Services

- `/api/health` — health + proxy count.
- `/api/whoami` — header echo for fingerprint checks.
- `/api/v1/proxies` — list of recent proxies with Redis rate limiting.
- `/ws` — WebSocket for bulk proxy checking.

## Operations

- Use `PROXY_LIST_PATH` to seed proxies from a local file (Tool 0).
- Use `GEOIP_DB` to enable country lookup.
- Tune `MAX_CONCURRENT` for scan throughput.
- Set `TRUSTED_PROXIES` if you run behind a reverse proxy.
- WebSocket connections send periodic pings to keep sessions healthy.

## Deploy

- `docker-compose.yml` runs API + Redis + Web.
- API writes SQLite to the `api-data` volume.
