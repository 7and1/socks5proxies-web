# Cloudflare Deployment Quick Start

## Prerequisites

1. **Cloudflare Account**
   - Create account at https://dash.cloudflare.com
   - Get Account ID from Workers overview page

2. **Domain Configuration**
   - Add domain to Cloudflare
   - Point nameservers to Cloudflare

3. **Local Tools**
   ```bash
   npm install -g wrangler pnpm
   ```

## Initial Setup

### 1. Authenticate Wrangler

```bash
wrangler login
```

### 2. Set Environment Variables

```bash
# Add to .env or export
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
```

### 3. Configure Secrets (if needed)

```bash
# List secrets
wrangler secret list

# Set a secret
wrangler secret put JWT_SECRET
```

## Deployment

### Local Deployment

```bash
# Build
make cf-build

# Deploy
make cf-deploy
```

### Using Deployment Script

```bash
./deploy/cloudflare-deploy.sh production
```

### CI/CD Deployment

Push to `main` branch triggers automatic deployment via GitHub Actions.

Required GitHub Secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Required GitHub Variables:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_SITE_URL`

## Verification

```bash
# Tail logs
make cf-logs

# Health check
curl https://socks5proxies.com/api/health
```

## Troubleshooting

### "Account ID not found"

```bash
export CLOUDFLARE_ACCOUNT_ID="your_id"
wrangler whoami
```

### Build fails

```bash
# Clean and rebuild
rm -rf apps/web/.open-next apps/web/node_modules
pnpm install
make cf-build
```

### Deployment succeeds but site not accessible

1. Check DNS propagation: `dig socks55proxies.com`
2. Verify Cloudflare Pages/Workers is active
3. Check routing in wrangler.toml

## Architecture Notes

- **Static Content**: Served from Cloudflare Edge
- **API Proxy**: Routes to origin at `api.socks5proxies.com`
- **WebSocket**: Direct connection to origin (bypasses Cloudflare proxy)

See `docs/CLOUDFLARE-HYBRID.md` for full architecture details.
