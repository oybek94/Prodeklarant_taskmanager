#!/bin/bash

# Prisma client'ni generate qilish va backend'ni ishga tushirish

set -e

echo "🔧 Prisma client'ni sozlash..."
echo ""

cd /var/www/prodeklarant/backend

# 1. Dependencies'ni tekshirish va o'rnatish
echo "📦 Dependencies'ni tekshirish..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.prisma/client/index.js" ]; then
    echo "📦 Dependencies o'rnatilmoqda..."
    npm install
else
    echo "✅ Dependencies mavjud"
fi
echo ""

# 2. Prisma generate
echo "🔧 Prisma client'ni generate qilish..."
npx prisma generate
echo ""

# 3. Prisma client'ni tekshirish
echo "📁 Prisma client'ni tekshirish..."
if [ -f "node_modules/.prisma/client/index.js" ]; then
    echo "✅ Prisma client generate qilingan"
    ls -lh node_modules/.prisma/client/index.js
else
    echo "❌ Prisma client generate qilinmadi!"
    echo "🔧 Qayta urinib ko'ramiz..."
    rm -rf node_modules/.prisma
    npx prisma generate
    if [ ! -f "node_modules/.prisma/client/index.js" ]; then
        echo "❌ Prisma client hali ham generate qilinmadi!"
        exit 1
    fi
fi
echo ""

# 4. Build qilish
echo "🏗️  Build qilinmoqda..."
if npm run build 2>&1 | tee build.log; then
    echo "✅ Build muvaffaqiyatli!"
else
    echo "❌ Build xatolik!"
    cat build.log
    exit 1
fi
echo ""

# 5. Server faylini topish
echo "📁 Server faylini topish..."
if [ -f "dist/index.js" ]; then
    SERVER_FILE="dist/index.js"
elif [ -f "dist/server.js" ]; then
    SERVER_FILE="dist/server.js"
elif [ -f "dist/src/server.js" ]; then
    SERVER_FILE="dist/src/server.js"
elif [ -f "dist/src/index.js" ]; then
    SERVER_FILE="dist/src/index.js"
else
    echo "❌ Server fayli topilmadi!"
    echo "📁 dist papkasidagi fayllar:"
    find dist -name "*.js" -type f 2>/dev/null | head -20
    exit 1
fi

echo "✅ Server fayli topildi: $SERVER_FILE"
ls -lh "$SERVER_FILE"
echo ""

# 6. PM2'da ishga tushirish
echo "▶️  Backend'ni PM2'da ishga tushirish..."
pm2 delete prodeklarant-backend 2>/dev/null || true
pm2 start "$SERVER_FILE" --name prodeklarant-backend
pm2 save
echo ""

# 7. Kichik kutish
echo "⏳ Backend ishga tushishini kutish..."
sleep 3
echo ""

# 8. PM2 status
echo "📊 PM2 Status:"
pm2 status
echo ""

# 9. Backend loglari
echo "📝 Backend loglari (oxirgi 20 qator):"
pm2 logs prodeklarant-backend --lines 20 --nostream || echo "⚠️  Loglar o'qib bo'lmadi"
echo ""

# 10. Health check
echo "🧪 Backend'ni test qilish..."
for i in {1..5}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend ishlayapti!"
        curl -s http://localhost:3001/health | head -5
        break
    else
        if [ $i -eq 5 ]; then
            echo "❌ Backend javob bermayapti!"
            echo "📝 Batafsil loglar:"
            pm2 logs prodeklarant-backend --lines 50 --nostream
            exit 1
        fi
        echo "   Kutish... ($i/5)"
        sleep 2
    fi
done
echo ""

# 11. Nginx reload
echo "🌐 Nginx'ni qayta yuklash..."
systemctl reload nginx
echo "✅ Nginx qayta yuklandi"
echo ""

echo "✅ Barcha jarayonlar yakunlandi!"
echo ""
echo "📊 Tekshirish:"
echo "   PM2: pm2 status"
echo "   Logs: pm2 logs prodeklarant-backend"
echo "   Health: curl http://localhost:3001/health"
echo ""
echo "🌐 Dastur: http://138.249.7.15"


