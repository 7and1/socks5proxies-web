# Operations Runbook - socks5proxies.com

## Overview

This runbook covers operational tasks for the socks5proxies.com application deployed on `107.174.42.198`.

**Server**: root@107.174.42.198
**Project Path**: `/opt/docker-projects/heavy-tasks/socks5proxies.com`
**Domains**: socks5proxies.com, api.socks5proxies.com

## Table of Contents

1. [Deployment](#deployment)
2. [Logs and Monitoring](#logs-and-monitoring)
3. [Service Management](#service-management)
4. [Troubleshooting](#troubleshooting)
5. [Database Operations](#database-operations)
6. [Backup and Recovery](#backup-and-recovery)
7. [Emergency Procedures](#emergency-procedures)

---

## Deployment

### Standard Deployment

```bash
# 1. Sync code from local to server
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next' --exclude 'data' \
  /path/to/local/socks5proxies.com/ \
  root@107.174.42.198:/opt/docker-projects/heavy-tasks/socks5proxies.com/

# 2. SSH into server
ssh root@107.174.42.198

# 3. Navigate to project directory
cd /opt/docker-projects/heavy-tasks/socks5proxies.com

# 4. Deploy (build and start)
make deploy
```

### Quick Deploy (No Code Changes)

```bash
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make restart"
```

### Deploy with Nginx Config Changes

```bash
# 1. Copy new nginx config
scp deploy/nginx/socks5proxies.com.conf root@107.174.42.198:/opt/docker-projects/nginx-proxy/config/conf.d/

# 2. Test nginx config
ssh root@107.174.42.198 "docker exec nginx-proxy nginx -t"

# 3. If test passes, reload nginx
ssh root@107.174.42.198 "docker restart nginx-proxy"
```

---

## Logs and Monitoring

### View All Logs

```bash
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make logs"
```

### View Specific Service Logs

```bash
# API logs
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make logs-api"

# Web logs
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make logs-web"

# Redis logs
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make logs-redis"
```

### View Recent Logs (Last 100 Lines)

```bash
ssh root@107.174.42.198 "docker-compose logs --tail=100 api"
ssh root@107.174.42.198 "docker-compose logs --tail=100 web"
```

### View Nginx Logs

```bash
# Access logs
ssh root@107.174.42.198 "docker exec nginx-proxy tail -f /var/log/nginx/socks5proxies-access.log"

# Error logs
ssh root@107.174.42.198 "docker exec nginx-proxy tail -f /var/log/nginx/socks5proxies-error.log"
```

### Health Checks

```bash
# Local health checks
ssh root@107.174.42.198 "curl -s http://localhost:3000/api/health"
ssh root@107.174.42.198 "curl -s http://localhost:8080/api/health"

# Public health checks
curl -s https://socks5proxies.com/api/health
curl -s https://api.socks5proxies.com/api/health

# Container status
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make ps"
```

### Observability Stack

```bash
# Start Prometheus + Grafana + OTel collector
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make obs-up"

# Prometheus UI (local)
ssh root@107.174.42.198 "curl -s http://localhost:9090/-/ready"

# Grafana UI (local)
ssh root@107.174.42.198 "curl -s http://localhost:3011/login"
```

### External Monitoring

- **Uptime Dashboard**: https://uptime.expertbeacon.com
- **Logs Dashboard**: https://logs.expertbeacon.com
- **Umami Analytics**: https://umami.expertbeacon.com

---

## Service Management

### Start All Services

```bash
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make up"
```

### Stop All Services

```bash
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make down"
```

### Restart All Services

```bash
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make restart"
```

### Restart Specific Service

```bash
# Restart API only
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && docker-compose restart api"

# Restart Web only
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && docker-compose restart web"

# Restart Redis only
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && docker-compose restart redis"
```

### Access Container Shell

```bash
# API container
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make shell-api"

# Web container
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make shell-web"

# Redis CLI
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make shell-redis"
```

---

## Export Jobs

### Notes

- Export jobs are stored in Redis when available; otherwise in-memory.
- Export files are written to `EXPORT_DIR` (default: `./data/exports`).
- Jobs expire after `EXPORT_JOB_TTL` (default: `2h`) and files are cleaned up on expiry.

### Check Job Status

```bash
curl -s "https://api.socks5proxies.com/api/proxies/export/jobs/<job_id>"
```

### Download Completed Job

```bash
curl -s -O "https://api.socks5proxies.com/api/proxies/export/jobs/<job_id>/download"
```

### Monitor Export Usage

```bash
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && du -sh data/api/exports"
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && ls -lh data/api/exports | tail -n 20"
```

### Cleanup (if disk usage grows)

```bash
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && ls -lh data/api/exports"
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && find data/api/exports -type f -mtime +2 -delete"
```

### Backup & Disk Alerts

```bash
# One-off backup (keeps 7 days by default)
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && deploy/ops/backup-data.sh"

# Disk usage check for exports (use in cron / monitoring)
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && deploy/ops/check-export-disk.sh"
```

### Cloudflare (Real IP)

```bash
# Refresh Cloudflare IP allowlist before nginx reload
ssh root@107.174.42.198 \"cd /opt/docker-projects/heavy-tasks/socks5proxies.com && deploy/nginx/update-cloudflare-ips.sh\"
```

---

## Troubleshooting

### Service Not Starting

1. **Check port conflicts**

   ```bash
   ssh root@107.174.42.198 "ss -tlnp | grep -E '3000|8080'"
   ```

2. **Check container logs for errors**

   ```bash
   ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && docker-compose logs api"
   ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && docker-compose logs web"
   ```

3. **Check disk space**

   ```bash
   ssh root@107.174.42.198 "df -h"
   ```

4. **Verify environment variables**
   ```bash
   ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && cat .env.production"
   ```

### High CPU/Memory Usage

1. **Check container resource usage**

   ```bash
   ssh root@107.174.42.198 "docker stats --no-stream"
   ```

2. **Restart affected service**

   ```bash
   ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && docker-compose restart api"
   ```

3. **Check for connection leaks**
   ```bash
   ssh root@107.174.42.198 "netstat -an | grep :8080 | wc -l"
   ```

### API Not Responding

1. **Check if API container is running**

   ```bash
   ssh root@107.174.42.198 "docker ps | grep socksproxies-api"
   ```

2. **Check API health endpoint**

   ```bash
   ssh root@107.174.42.198 "curl -v http://localhost:8080/api/health"
   ```

3. **Check Redis connectivity**
   ```bash
   ssh root@107.174.42.198 "docker exec socksproxies-api redis-cli -h redis ping"
   ```

### WebSocket Connection Issues

1. **Check nginx configuration**

   ```bash
   ssh root@107.174.42.198 "docker exec nginx-proxy nginx -t"
   ```

2. **Check WebSocket upgrade headers**

   ```bash
   ssh root@107.174.42.198 "docker exec nginx-proxy grep -A 10 'location /ws' /etc/nginx/conf.d/socks5proxies.com.conf"
   ```

3. **Test WebSocket connection**
   ```bash
   wscat -c wss://api.socks5proxies.com/ws
   ```

### Rate Limiting Issues

1. **Check current Redis rate limit counters**

   ```bash
   ssh root@107.174.42.198 "docker exec socksproxies-redis redis-cli --scan --pattern 'ratelimit:*' | xargs -I {} redis-cli GET {}"
   ```

2. **Clear specific rate limit (carefully)**
   ```bash
   ssh root@107.174.42.198 "docker exec socksproxies-redis redis-cli DEL 'ratelimit:sw:IP_ADDRESS:TIMESTAMP'"
   ```

### 502 Bad Gateway

1. **Check if backend services are running**

   ```bash
   ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && docker-compose ps"
   ```

2. **Check nginx upstream configuration**

   ```bash
   ssh root@107.174.42.198 "docker exec nginx-proxy grep -A 5 'upstream socksproxies' /etc/nginx/conf.d/socks5proxies.com.conf"
   ```

3. **Test direct connection to backend**
   ```bash
   ssh root@107.174.42.198 "curl -v http://localhost:8080/api/health"
   ```

### SSL Certificate Issues

1. **Check certificate validity**

   ```bash
   openssl s_client -connect socks5proxies.com:443 -servername socks5proxies.com | openssl x509 -noout -dates
   ```

2. **Check nginx-proxy certificates**

   ```bash
   ssh root@107.174.42.198 "ls -la /var/docker-certificates/ | grep socksproxies"
   ```

3. **Force certificate renewal**
   ```bash
   ssh root@107.174.42.198 "docker restart nginx-proxy"
   ```

---

## Database Operations

### SQLite Database Location

```
/opt/docker-projects/heavy-tasks/socks5proxies.com/data/api/socksproxies.db
```

### Backup Database

```bash
# Create backup
ssh root@107.174.42.198 "cp /opt/docker-projects/heavy-tasks/socks5proxies.com/data/api/socksproxies.db /opt/docker-projects/heavy-tasks/socks5proxies.com/data/api/socksproxies.db.backup.$(date +%Y%m%d_%H%M%S)"
```

### Query Database

```bash
ssh root@107.174.42.198 "docker exec socksproxies-api sqlite3 /data/socksproxies.db 'SELECT * FROM proxy_results ORDER BY checked_at DESC LIMIT 10;'"
```

### Redis Operations

```bash
# Check Redis info
ssh root@107.174.42.198 "docker exec socksproxies-redis redis-cli INFO"

# Check memory usage
ssh root@107.174.42.198 "docker exec socksproxies-redis redis-cli INFO memory"

# Flush all Redis data (CAUTION)
ssh root@107.174.42.198 "docker exec socksproxies-redis redis-cli FLUSHALL"
```

---

## Backup and Recovery

### Create Full Backup

```bash
# 1. Backup database
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && tar -czf backups/full-backup-$(date +%Y%m%d_%H%M%S).tar.gz data/ .env.production"
```

### Restore from Backup

```bash
# 1. Stop services
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make down"

# 2. Restore data
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && tar -xzf backups/full-backup-TIMESTAMP.tar.gz"

# 3. Start services
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make deploy"
```

### Restore Previous Git Version

```bash
# 1. SSH into server
ssh root@107.174.42.198
cd /opt/docker-projects/heavy-tasks/socks5proxies.com

# 2. Check git log
git log --oneline -10

# 3. Reset to previous commit
git reset --hard <commit-hash>

# 4. Redeploy
make deploy
```

---

## Emergency Procedures

### Immediate Service Shutdown

```bash
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make down"
```

### Enable Maintenance Mode

```bash
# Add maintenance page to nginx
ssh root@107.174.42.198 "docker exec nginx-proxy bash -c 'echo \"location / { return 503; }\" > /etc/nginx/conf.d/maintenance.conf && nginx -s reload'"
```

### Disable Maintenance Mode

```bash
ssh root@107.174.42.198 "docker exec nginx-proxy bash -c 'rm -f /etc/nginx/conf.d/maintenance.conf && nginx -s reload'"
```

### Full Service Reset

```bash
# 1. Stop all services
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make down"

# 2. Clear Redis cache (optional)
ssh root@107.174.42.198 "docker exec socksproxies-redis redis-cli FLUSHALL"

# 3. Restart services
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && make deploy"
```

### Contact Information

- **Server Administrator**: root@107.174.42.198
- **Project Repository**: [URL]
- **Issue Tracker**: [URL]
- **Emergency Contacts**: [Add contacts here]

---

## Useful Commands Reference

```bash
# Quick status check
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && docker-compose ps && curl -s http://localhost:8080/api/health"

# View last 50 API errors
ssh root@107.174.42.198 "docker-compose logs --tail=50 api | grep -i error"

# Count active WebSocket connections
ssh root@107.174.42.198 "docker exec socksproxies-redis redis-cli --scan --pattern 'wsconn:*' | wc -l"

# Check disk usage
ssh root@107.174.42.198 "du -sh /opt/docker-projects/heavy-tasks/socks5proxies.com/data/"

# Monitor real-time logs
ssh root@107.174.42.198 "cd /opt/docker-projects/heavy-tasks/socks5proxies.com && docker-compose logs -f"
```
