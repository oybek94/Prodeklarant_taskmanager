#!/bin/bash

# Backend'ni build qilish va ishga tushirish script'i

set -e

echo "🚀 Building and starting backend..."

cd /var/www/prodeklarant/backend

# Dependencies'ni tekshirish
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build qilish
echo "🏗️  Building backend..."
npm run build

# Build muvaffaqiyatli bo'lganini tekshirish
if [ ! -f "dist/server.js" ]; then
    echo "❌ Build xatolik! dist/server.js fayli yaratilmadi."
    echo "📝 Quyidagi buyruqni bajarib, xatoliklarni ko'ring:"
    echo "   npm run build"
    exit 1
fi

echo "✅ Build muvaffaqiyatli!"

# PM2'da process bor-yo'qligini tekshirish
if pm2 list | grep -q "prodeklarant-backend"; then
    echo "🔄 Restarting existing process..."
    pm2 restart prodeklarant-backend
else
    echo "✨ Starting new process..."
    pm2 start dist/server.js --name prodeklarant-backend
    pm2 save
fi

echo "✅ Backend started!"
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📝 View logs with: pm2 logs prodeklarant-backend"


