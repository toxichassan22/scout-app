#!/bin/bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/scout-app}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:5000/api/ready}"

echo "========================================"
echo "  Scout App - Safe Deploy"
echo "========================================"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$APP_DIR"

echo "Fetching origin/main..."
git fetch --prune origin main
git reset --hard origin/main

echo "Installing reproducible dependencies..."
npm ci
npm --prefix server ci

# Prisma CLI validation runs before PM2 starts and therefore needs the same
# database URL that the backend will use. Production may provide it through the
# service environment; otherwise use the repository's persistent SQLite path.
export DATABASE_URL="${DATABASE_URL:-file:${APP_DIR}/server/prisma/dev.db}"
export SQLITE_DATABASE_PATH="${SQLITE_DATABASE_PATH:-${APP_DIR}/server/prisma/dev.db}"

echo Generating and validating Prisma client..."
npm --prefix server run prisma:validate
npm --prefix server run prisma:generate

echo "Checking SQLite readiness and schema drift before restart..."
npm --prefix server run db:ready
npm --prefix server run db:drift
if [ "${APPLY_PRISMA_MIGRATIONS:-false}" = "true" ]; then
  echo "Applying safe Prisma migrations..."
  npm --prefix server exec prisma migrate deploy
fi

echo "Building frontend..."
npm run build

echo "Restarting backend..."
if pm2 describe scout-app >/dev/null 2>&1; then
  pm2 restart server/ecosystem.config.cjs --env production --update-env
else
  pm2 start server/ecosystem.config.cjs --env production
fi

echo "Waiting for readiness..."
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error "$HEALTH_URL" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "Deployment failed: backend did not become ready." >&2
    pm2 logs scout-app --lines 100 --nostream || true
    exit 1
  fi
  sleep 2
done

echo "Validating and reloading Nginx..."
if command -v sudo >/dev/null 2>&1; then
  sudo cp "$APP_DIR/nginx-optimized.conf" /etc/nginx/sites-available/scout-app
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "Deployment completed successfully and readiness was verified."
