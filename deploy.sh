#!/bin/bash
set -e

echo "========================================"
echo "  🚀 Scout App - Auto Deploy Script"
echo "========================================"

cd /var/www/scout-app

echo "📥 تنزيل آخر تحديثات من GitHub..."
git pull origin main

echo "📦 تثبيت الـ Packages..."
npm install --production=false
cd server && npm install && npx prisma generate && cd ..

echo "🔨 بناء ملفات الفرونت إند..."
npm run build

echo "⚡ تطبيق إعدادات Nginx المحسّنة للضغط والتخزين..."
sudo cp /var/www/scout-app/nginx-optimized.conf /etc/nginx/sites-available/scout-app
sudo nginx -t && sudo systemctl reload nginx

echo "🔄 إعادة تشغيل الباك إند بنظام Cluster (كل الـ CPU Cores)..."
cd server && pm2 restart ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production && cd ..

echo ""
echo "========================================"
echo "  ✅ تم النشر والتسريع بنجاح!"
echo "========================================"
