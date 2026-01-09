# Deployment Checklist - socks5proxies.com

## Pre-Deployment Checks

### 1. Local Validation

- [ ] Frontend builds successfully: `cd apps/web && npm run build`
- [ ] Backend builds successfully (Go 1.24+): `cd apps/server && go build ./cmd/server`
- [ ] All tests pass: `cd apps/web && npm test` and `cd apps/server && go test ./...`
- [ ] No TypeScript errors: `cd apps/web && npm run lint`
- [ ] Docker compose config is valid: `docker-compose config`

### 2. Port Availability Check

```bash
ssh root@107.174.42.198 "ss -tlnp | grep -E '3000|8080|6379'"
```

- [ ] Port 3000 (Web) is available
- [ ] Port 8080 (API) is available
- [ ] Port 6379 (Redis internal) is available

### 3. Environment Variables Setup

- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Set `NEXT_PUBLIC_API_URL` (e.g., `https://api.socks5proxies.com`)
- [ ] Set `NEXT_PUBLIC_WS_URL` (e.g., `wss://api.socks5proxies.com/ws`)
- [ ] Set `NEXT_PUBLIC_SITE_URL` (e.g., `https://socks5proxies.com`)
- [ ] Set `REDIS_PASSWORD` (generate secure password)
- [ ] Set `RATE_LIMIT_PER_DAY` (default: 100)
- [ ] Set `MAX_CONCURRENT` (default: 50)
- [ ] Set `JUDGE_URL` (default: `https://api.ipify.org?format=text`)
- [ ] Set `ALLOWED_ORIGINS` (default: `*` for public API)
- [ ] Set `SENTRY_DSN` or `OTEL_EXPORTER_OTLP_ENDPOINT` for observability
- [ ] Set `SLOW_REQUEST_THRESHOLD` (default: `2s`)

## Deployment Steps

### 4. Code Sync

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next' --exclude 'data' \
  /Volumes/SSD/skills/server-ops/vps/107.174.42.198/heavy-tasks/socks5proxies.com/ \
  root@107.174.42.198:/opt/docker-projects/heavy-tasks/socks5proxies.com/
```

- [ ] Code synced to server
- [ ] `.env.production` file exists on server
- [ ] `data/` directory exists with proper permissions

### 5. Nginx Configuration

```bash
# Copy nginx config
scp deploy/nginx/socks5proxies.com.conf \
  root@107.174.42.198:/opt/docker-projects/nginx-proxy/config/conf.d/

# Test nginx config
ssh root@107.174.42.198 "docker exec nginx-proxy nginx -t"

# Reload nginx
ssh root@107.174.42.198 "docker restart nginx-proxy"
```

- [ ] Nginx config copied
- [ ] Nginx config test passed
- [ ] Nginx reloaded successfully

### 6. Docker Deployment

```bash
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make deploy"
```

- [ ] Containers built successfully
- [ ] All containers started: `docker-compose ps`
- [ ] No container errors in logs

## Post-Deployment Verification

### 7. Health Checks

```bash
# Web health
curl -s http://localhost:3000/api/health

# API health
curl -s http://localhost:8080/api/health

# Public health
curl -s https://socks5proxies.com/api/health
curl -s https://api.socks5proxies.com/api/health
```

- [ ] Web health endpoint returns 200
- [ ] API health endpoint returns 200
- [ ] Public endpoints accessible via HTTPS

### 8. Functional Testing

- [ ] Homepage loads: `https://socks5proxies.com`
- [ ] Bulk checker page loads
- [ ] Converter page loads
- [ ] IP Score page loads
- [ ] API endpoints respond: `https://api.socks5proxies.com/api/v1/check`
- [ ] WebSocket connection works (if applicable)
- [ ] Static assets load correctly
- [ ] SSL certificates valid

### 9. Monitoring Setup

- [ ] Logs accessible: `make logs`
- [ ] Uptime monitoring configured (uptime.expertbeacon.com)
- [ ] Error tracking configured (if applicable)
- [ ] Analytics configured (if applicable)

### 10. Performance Validation

- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms (for single proxy check)
- [ ] No memory leaks in containers
- [ ] CPU usage normal under load

## Rollback Procedure (if issues)

```bash
# Stop current deployment
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make down"

# Restore previous version from backup/git
# ... (restore steps)

# Restart services
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make deploy"
```

## Security Verification

- [ ] Only ports 80/443 exposed publicly
- [ ] All services bind to 127.0.0.1
- [ ] Rate limiting active in nginx
- [ ] Security headers present
- [ ] SSL/TLS configuration correct
- [ ] No sensitive data in logs

## Documentation

- [ ] Deployment runbook updated
- [ ] Any configuration changes documented
- [ ] Team notified of deployment
- [ ] Deployment ticket closed

## Quick Reference Commands

```bash
# Check status
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make ps"

# View logs
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make logs"

# Restart services
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make restart"

# Rebuild and deploy
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make deploy"
```
