#!/bin/sh
set -e

if [ -d /data ]; then
  # Try to claim ownership; fall back to permissive mode if the mount blocks chown.
  if ! chown -R appuser:appgroup /data 2>/dev/null; then
    chmod -R a+rwX /data || true
  fi
fi

exec su-exec appuser:appgroup /bin/server
