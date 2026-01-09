# Delivery Checklist

- [ ] Backend runs locally (`go run ./cmd/server`).
- [ ] Web runs locally (`pnpm dev`).
- [ ] WebSocket bulk checker returns results.
- [ ] `/api/whoami` returns headers.
- [ ] Redis rate limiting enforced on `/api/v1/proxies`.
- [ ] SQLite persists proxy check results.
- [ ] GeoIP lookup enabled when `GEOIP_DB` provided.
- [ ] Trusted proxy list configured (`TRUSTED_PROXIES`) behind load balancer.
- [ ] Unit tests pass.
- [ ] Docker Compose boots all services.
