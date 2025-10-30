#!/usr/bin/env bash
set -euo pipefail

mkdir -p /data

if [ ! -f /data/pelubot.db ] && [ -n "${DB_SEED_B64_URL:-}" ]; then
  echo "[seed] downloading b64 from ${DB_SEED_B64_URL}"
  curl -fsSL "${DB_SEED_B64_URL}" -o /tmp/pelubot.db.b64
  base64 -d /tmp/pelubot.db.b64 > /data/pelubot.db
  rm -f /tmp/pelubot.db.b64
  ls -lh /data/pelubot.db || true
fi

cd /app/backend

echo "[run] starting app…"
exec uvicorn app.main:app --host 0.0.0.0 --port 8776 --workers "${UVICORN_WORKERS:-2}" --log-level "${UVICORN_LOG_LEVEL:-info}"
