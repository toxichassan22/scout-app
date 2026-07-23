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

echo "🔄 إعادة تشغيل الباك إند..."
pm2 restart scout-backend

echo ""
echo "========================================"
echo "  ✅ تم النشر بنجاح!"
echo "========================================"
