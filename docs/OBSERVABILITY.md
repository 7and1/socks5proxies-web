# Observability - Socks5Proxies.com

## Overview

The API supports **Sentry** for error monitoring and **OpenTelemetry (OTLP gRPC)** for tracing.
Both are optional and disabled by default unless configured via environment variables.

## Environment Variables

```
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.0
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_INSECURE=true
OTEL_SERVICE_NAME=socks5proxies-api
SLOW_REQUEST_THRESHOLD=2s
WAF_ENABLED=true
```

## Quick Setup

### Sentry

1. Create a Sentry project.
2. Set `SENTRY_DSN` in `.env`.
3. (Optional) Set `SENTRY_TRACES_SAMPLE_RATE` (e.g., `0.1`).

### OpenTelemetry

1. Provide an OTLP gRPC endpoint (e.g., `http://otel-collector:4317`).
2. Set `OTEL_EXPORTER_OTLP_ENDPOINT`.
3. Set `OTEL_EXPORTER_OTLP_INSECURE=true` if not using TLS.

### Prometheus + Grafana

Run the bundled observability stack:

```
docker compose -f deploy/monitoring/docker-compose.observability.yml up -d
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3011` (default password `changeme`, set `GRAFANA_ADMIN_PASSWORD`)

## Alerts

- **Slow requests**: logged when latency exceeds `SLOW_REQUEST_THRESHOLD`.
- **WebSocket anomalies**: upgrade failures, ping failures, and unexpected closes are reported (Sentry).
- **WAF blocks**: logged and returned as `WAF_BLOCKED`.

## Notes

- If no Sentry/OTel variables are set, observability gracefully degrades to logs only.
- WAF applies to `/api/*` routes only and can be disabled with `WAF_ENABLED=false`.
