#!/bin/bash

# Backend'ni PM2 bilan ishga tushirish script'i

echo "🚀 Starting backend with PM2..."

cd /var/www/prodeklarant/backend

# Build'ni tekshirish
if [ ! -d "dist" ]; then
    echo "📦 Building backend..."
    npm run build
fi

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

