#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
BACKEND_PORT="${BACKEND_PORT:-8140}"
HOST="${HOST:-0.0.0.0}"

cd "$BACKEND_DIR"

export PYTHONIOENCODING="${PYTHONIOENCODING:-utf-8}"

if [[ ! -f ".env" ]]; then
  echo "[start_backend] Missing backend/.env. Please create it before starting the backend."
  exit 1
fi

mkdir -p ../uploads

if [[ -x ".venv/bin/python" ]]; then
  PYTHON_BIN=".venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
else
  echo "[start_backend] Python was not found. Please install Python 3 first."
  exit 1
fi

echo "[start_backend] Using Python: $PYTHON_BIN"
echo "[start_backend] Starting FastAPI on ${HOST}:${BACKEND_PORT} with no-cache headers"

exec "$PYTHON_BIN" -m uvicorn app.main:app \
  --host "$HOST" \
  --port "$BACKEND_PORT" \
  --header "Cache-Control:no-cache, no-store, must-revalidate" \
  --header "Pragma:no-cache" \
  --header "Expires:0"
