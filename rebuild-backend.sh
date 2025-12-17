#!/bin/bash

# Backend'ni qayta build qilish va ishga tushirish script'i

set -e

echo "🔧 Backend'ni qayta build qilish va ishga tushirish..."

cd /var/www/prodeklarant/backend

# Dependencies'ni tekshirish
if [ ! -d "node_modules" ]; then
    echo "📦 Dependencies o'rnatilmoqda..."
    npm install
fi

# Build qilish
echo "🏗️  Build qilinmoqda..."
npm run build

# Build muvaffaqiyatli bo'lganini tekshirish
if [ ! -f "dist/server.js" ]; then
    echo "❌ Build xatolik! dist/server.js fayli yaratilmadi."
    echo "📝 Xatoliklarni ko'ring:"
    npm run build 2>&1 | tail -50
    exit 1
fi

echo "✅ Build muvaffaqiyatli!"

# PM2'da process bor-yo'qligini tekshirish
if pm2 list | grep -q "prodeklarant-backend"; then
    echo "🔄 Backend'ni qayta ishga tushirish..."
    pm2 restart prodeklarant-backend
else
    echo "✨ Backend'ni ishga tushirish..."
    pm2 start dist/server.js --name prodeklarant-backend
    pm2 save
fi

echo ""
echo "✅ Backend ishga tushirildi!"
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📝 Loglarni ko'rish:"
echo "   pm2 logs prodeklarant-backend"

