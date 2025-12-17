#!/bin/bash

# Backend'ni tekshirish va tuzatish

set -e

echo "🔍 Backend holatini tekshirish..."
echo ""

cd /var/www/prodeklarant/backend

# 1. PM2 status
echo "📊 PM2 Status:"
pm2 status || echo "⚠️  PM2 ishlamayapti"
echo ""

# 2. Backend faylini tekshirish
echo "📁 Backend faylini tekshirish:"
if [ -f "dist/server.js" ]; then
    echo "✅ dist/server.js mavjud"
    ls -lh dist/server.js
else
    echo "❌ dist/server.js topilmadi!"
    echo "🏗️  Build qilinmoqda..."
    npm run build
    if [ ! -f "dist/server.js" ]; then
        echo "❌ Build xatolik! Xatolik xabarini ko'ring:"
        npm run build 2>&1 | tail -50
        exit 1
    fi
    echo "✅ Build muvaffaqiyatli!"
fi
echo ""

# 3. Port tekshirish
echo "🔌 Port 3001 tekshirish:"
if netstat -tuln | grep -q ":3001 "; then
    echo "✅ Port 3001 ishlatilmoqda"
    netstat -tuln | grep ":3001 "
else
    echo "⚠️  Port 3001 ishlatilmayapti"
fi
echo ""

# 4. Backend'ni ishga tushirish
echo "🚀 Backend'ni ishga tushirish..."
if pm2 list | grep -q "prodeklarant-backend"; then
    echo "🔄 Backend qayta ishga tushirilmoqda..."
    pm2 restart prodeklarant-backend
    sleep 2
    pm2 status
else
    echo "▶️  Backend yangi ishga tushirilmoqda..."
    pm2 start dist/server.js --name prodeklarant-backend
    pm2 save
    sleep 2
    pm2 status
fi
echo ""

# 5. Backend loglari
echo "📝 Backend loglari (oxirgi 20 qator):"
pm2 logs prodeklarant-backend --lines 20 --nostream || echo "⚠️  Loglar o'qib bo'lmadi"
echo ""

# 6. Backend'ni test qilish
echo "🧪 Backend'ni test qilish:"
sleep 1
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend ishlayapti! Health check:"
    curl -s http://localhost:3001/health | head -5
else
    echo "❌ Backend javob bermayapti!"
    echo "📝 Batafsil loglar:"
    pm2 logs prodeklarant-backend --lines 50 --nostream
fi
echo ""

# 7. Nginx tekshirish
echo "🌐 Nginx tekshirish:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx ishlayapti"
    systemctl reload nginx
    echo "✅ Nginx qayta yuklandi"
else
    echo "⚠️  Nginx ishlamayapti"
    systemctl start nginx
    echo "✅ Nginx ishga tushirildi"
fi
echo ""

echo "✅ Tekshirish yakunlandi!"
echo ""
echo "📊 Holat:"
echo "   PM2: pm2 status"
echo "   Logs: pm2 logs prodeklarant-backend"
echo "   Backend: curl http://localhost:3001/health"
echo "   Nginx: systemctl status nginx"

