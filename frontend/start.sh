#!/bin/sh
set -e

# Default to port 80 if PORT not set
export PORT="${PORT:-80}"

echo "Starting nginx on port $PORT"
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Generated nginx config:"
cat /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
