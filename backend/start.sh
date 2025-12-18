#!/bin/sh
set -e

# Default to port 8000 if PORT not set
export PORT="${PORT:-8000}"

echo "Starting uvicorn on port $PORT"
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
