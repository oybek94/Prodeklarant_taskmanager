#!/bin/bash

# To'liq setup: Build + Start

set -e

echo "🚀 To'liq setup: Build va Start..."

cd /var/www/prodeklarant/backend

# 1. Dependencies
echo "📦 Dependencies'ni tekshirish..."
if [ ! -d "node_modules" ]; then
    echo "📦 Dependencies o'rnatilmoqda..."
    npm install
fi

# 2. Build
echo "🏗️  Build qilinmoqda..."
if ! npm run build 2>&1 | tee build.log; then
    echo "❌ Build xatolik!"
    echo "📝 To'liq xatolik xabari:"
    cat build.log
    exit 1
fi

# 3. Build tekshirish
if [ ! -f "dist/server.js" ]; then
    echo "❌ Build xatolik! dist/server.js fayli yaratilmadi."
    echo "📝 Xatolik xabari:"
    cat build.log 2>/dev/null || echo "Build log topilmadi"
    exit 1
fi

echo "✅ Build muvaffaqiyatli!"

# 4. PM2'da ishga tushirish
echo "🔄 Backend'ni PM2'da ishga tushirish..."
if pm2 list | grep -q "prodeklarant-backend"; then
    pm2 restart prodeklarant-backend
    echo "✅ Backend qayta ishga tushirildi"
else
    pm2 start dist/server.js --name prodeklarant-backend
    pm2 save
    echo "✅ Backend ishga tushirildi"
fi

# 5. Nginx reload
echo "🌐 Nginx'ni qayta yuklash..."
systemctl reload nginx
echo "✅ Nginx qayta yuklandi"

echo ""
echo "✅ Barcha jarayonlar yakunlandi!"
echo ""
echo "📊 Tekshirish:"
pm2 status
echo ""
echo "📝 Loglarni ko'rish:"
echo "   pm2 logs prodeklarant-backend"
echo ""
echo "🌐 Dastur: http://138.249.7.15"

