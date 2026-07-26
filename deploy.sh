#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR=${APP_DIR:-/var/www/scout-app}
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:5000/api/ready}

printf '%s\n' '========================================'
printf '%s\n' '  Scout App - Safe Deploy'
printf '%s\n' '========================================'

export NVM_DIR=${NVM_DIR:-$HOME/.nvm}
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi

cd "$APP_DIR"

printf '%s\n' 'Fetching origin/main...'
git fetch --prune origin main
git reset --hard origin/main

printf '%s\n' 'Installing reproducible dependencies...'
npm ci
npm --prefix server ci

# Prisma and PM2 must use the same persistent SQLite database.
SQLITE_DATABASE_PATH=${SQLITE_DATABASE_PATH:-$APP_DIR/server/prisma/dev.db}
DATABASE_URL=${DATABASE_URL:-file:$SQLITE_DATABASE_PATH}
export SQLITE_DATABASE_PATH DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
  printf '%s\n' 'Deployment failed: DATABASE_URL is empty.' >&2
  exit 1
fi

# التأكد من وجود مجلد قاعدة البيانات
mkdir -p "$(dirname "$SQLITE_DATABASE_PATH")"

printf '%s\n' 'Generating and validating Prisma client...'
npm --prefix server run prisma:validate
npm --prefix server run prisma:generate

printf '%s\n' 'Ensuring SQLite schema exists and pushing database changes...'
# Run from server/ so Prisma finds prisma/schema.prisma by default.
(cd server && npx prisma db push --accept-data-loss --skip-generate)

if [ "${APPLY_PRISMA_MIGRATIONS:-false}" = true ]; then
  # One-time baseline for databases that predate Prisma Migrate.
  # Set SCOUT_MIGRATION_BASELINE=true once per environment, then leave it unset.
  if [ "${SCOUT_MIGRATION_BASELINE:-false}" = true ]; then
    printf '%s\n' 'Marking baseline migration as applied...'
    (cd server && npx prisma migrate resolve --applied 00000000000000_init) || true
  fi
  printf '%s\n' 'Applying safe Prisma migrations...'
  (cd server && npx prisma migrate deploy)
fi

printf '%s\n' 'Checking SQLite readiness and schema drift before restart...'
npm --prefix server run db:ready
npm --prefix server run db:drift

if [ "${ALLOW_PRODUCTION_SEED:-}" = "I_UNDERSTAND_THIS_MODIFIES_DATA" ]; then
  printf '%s\n' 'Seeding initial festival data...'
  npm --prefix server run seed
fi

printf '%s\n' 'Ensuring server environment (JWT_SECRET, NODE_ENV, PORT)...'
node server/scripts/ensure-env.mjs

printf '%s\n' 'Building frontend...'
npm run build

printf '%s\n' 'Ensuring log directory exists...'
mkdir -p "$APP_DIR/logs"

printf '%s\n' 'Restarting backend (delete + start to reload cwd and reset crash counter)...'
pm2 delete scout-backend 2>/dev/null || true
pm2 start server/ecosystem.config.cjs --env production
pm2 save

printf '%s\n' 'Waiting for readiness...'
attempt=1
while [ "$attempt" -le 30 ]; do
  if curl --fail --silent --show-error "$HEALTH_URL" >/dev/null; then
    break
  fi

  if [ "$attempt" -eq 30 ]; then
    printf '%s\n' 'Deployment failed: backend did not become ready.' >&2
    pm2 logs scout-backend --lines 100 --nostream || true
    exit 1
  fi

  sleep 2
  attempt=$((attempt + 1))
done

printf '%s\n' 'Validating and reloading Nginx...'
if command -v sudo >/dev/null 2>&1; then
  sudo cp "$APP_DIR/nginx-optimized.conf" /etc/nginx/sites-available/scout-app
  sudo nginx -t
  sudo systemctl reload nginx
fi

printf '%s\n' 'Deployment completed successfully and readiness was verified.'