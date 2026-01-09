# Socks5Proxies.com

Production-grade proxy tooling stack.

## Stack

- Frontend: Next.js 14 (App Router) + Tailwind CSS
- Backend: Go 1.24 (Gin) + Gorilla WebSocket
- Data: SQLite + Redis

## Quick Start

```bash
# Backend
cd apps/server
cp ../../.env.example .env
# edit as needed

go run ./cmd/server
```

```bash
# Frontend
cd apps/web
pnpm install
pnpm dev
```

## Docker

```bash
docker-compose up --build
```

## Environment

See `.env.example` for all variables.

## Production Notes

- Set `TRUSTED_PROXIES` if running behind Nginx/Cloudflare.
- Provide `GEOIP_DB` to enable country lookups.
- Use `PROXY_LIST_PATH` to seed initial proxy inventory.

## Tests

```bash
cd apps/server
go test ./...

cd ../web
pnpm test
```
