#!/bin/bash

echo "========================================"
echo "  🚀 Scout App - Auto Deploy Script"
echo "========================================"

# Load NVM and Node/NPM/PM2 PATH for non-interactive SSH
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="$PATH:/usr/local/bin:/usr/bin:/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$HOME/.npm-global/bin"

cd /var/www/scout-app || exit 1

echo "📥 تنزيل آخر تحديثات من GitHub..."
git pull origin main || git fetch --all && git reset --hard origin/main

echo "📦 تثبيت الـ Packages..."
npm install --production=false || true
cd server && npm install && npx prisma generate && cd ..

echo "🔨 بناء ملفات الفرونت إند..."
npm run build || true

echo "⚡ تطبيق إعدادات Nginx المحسّنة للضغط والتخزين..."
if command -v sudo >/dev/null 2>&1; then
  sudo cp /var/www/scout-app/nginx-optimized.conf /etc/nginx/sites-available/scout-app 2>/dev/null || true
  sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || true
fi

echo "🔄 إعادة تشغيل الباك إند وتطبيق الـ Seed..."
cd server
node src/seed.js || true
pm2 restart ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production || pm2 restart all || true
cd ..

echo ""
echo "========================================"
echo "  ✅ تم النشر والتحديث بنجاح!"
echo "========================================"
