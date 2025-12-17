#!/bin/bash

# Backend'ni to'liq sozlash va ishga tushirish

set -e

echo "🚀 Backend'ni to'liq sozlash..."
echo ""

cd /var/www/prodeklarant/backend

# 1. Dependencies
echo "📦 Dependencies'ni tekshirish..."
if [ ! -d "node_modules" ]; then
    echo "📦 Dependencies o'rnatilmoqda..."
    npm install
else
    echo "✅ Dependencies mavjud"
fi
echo ""

# 2. TypeScript versiyasini tekshirish
echo "🔍 TypeScript versiyasini tekshirish..."
npx tsc --version
echo ""

# 3. Build qilish
echo "🏗️  Build qilinmoqda..."
echo "   (Bu biroz vaqt olishi mumkin...)"
if npm run build 2>&1 | tee build.log; then
    echo "✅ Build muvaffaqiyatli!"
else
    echo "❌ Build xatolik!"
    echo ""
    echo "📝 To'liq xatolik xabari:"
    cat build.log
    echo ""
    echo "🔍 TypeScript xatoliklari:"
    npx tsc --noEmit 2>&1 | head -100 || true
    exit 1
fi
echo ""

# 4. Build tekshirish
echo "📁 dist papkasini tekshirish..."
ls -la dist/ 2>/dev/null || echo "⚠️  dist papkasi mavjud emas"

# dist/index.js, dist/server.js yoki dist/src/server.js ni tekshirish
if [ -f "dist/index.js" ]; then
    SERVER_FILE="dist/index.js"
    echo "✅ dist/index.js mavjud"
    ls -lh dist/index.js
elif [ -f "dist/server.js" ]; then
    SERVER_FILE="dist/server.js"
    echo "✅ dist/server.js mavjud"
    ls -lh dist/server.js
elif [ -f "dist/src/server.js" ]; then
    SERVER_FILE="dist/src/server.js"
    echo "✅ dist/src/server.js mavjud"
    ls -lh dist/src/server.js
    echo "⚠️  Fayl dist/src/server.js da. tsconfig.json'da rootDir sozlash kerak."
elif [ -f "dist/src/index.js" ]; then
    SERVER_FILE="dist/src/index.js"
    echo "✅ dist/src/index.js mavjud"
    ls -lh dist/src/index.js
else
    echo "❌ Hech qanday server fayli topilmadi!"
    echo "📝 Build log:"
    cat build.log 2>/dev/null || echo "Build log topilmadi"
    echo ""
    echo "📁 dist papkasidagi fayllar:"
    find dist -name "*.js" -type f 2>/dev/null | head -20 || echo "dist papkasi mavjud emas"
    exit 1
fi
echo ""

# 5. Eski PM2 process'ni o'chirish
echo "🔄 PM2 process'ni yangilash..."
pm2 delete prodeklarant-backend 2>/dev/null || true
echo ""

# 6. Backend'ni ishga tushirish
echo "▶️  Backend'ni ishga tushirish..."
# SERVER_FILE yuqorida aniqlangan
pm2 start $SERVER_FILE --name prodeklarant-backend
pm2 save
echo ""

# 7. Kichik kutish (backend ishga tushishi uchun)
echo "⏳ Backend ishga tushishini kutish..."
sleep 3
echo ""

# 8. PM2 status
echo "📊 PM2 Status:"
pm2 status
echo ""

# 9. Backend loglari
echo "📝 Backend loglari (oxirgi 30 qator):"
pm2 logs prodeklarant-backend --lines 30 --nostream || echo "⚠️  Loglar o'qib bo'lmadi"
echo ""

# 10. Backend'ni test qilish
echo "🧪 Backend'ni test qilish..."
for i in {1..5}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend ishlayapti!"
        echo ""
        echo "📋 Health check javobi:"
        curl -s http://localhost:3001/health | head -10
        break
    else
        if [ $i -eq 5 ]; then
            echo "❌ Backend javob bermayapti!"
            echo ""
            echo "📝 Batafsil loglar:"
            pm2 logs prodeklarant-backend --lines 50 --nostream
            exit 1
        fi
        echo "   Kutish... ($i/5)"
        sleep 2
    fi
done
echo ""

# 11. Port tekshirish
echo "🔌 Port 3001 tekshirish:"
if netstat -tuln 2>/dev/null | grep -q ":3001 "; then
    echo "✅ Port 3001 ishlatilmoqda"
    netstat -tuln | grep ":3001 " || true
else
    echo "⚠️  Port 3001 ishlatilmayapti (netstat topilmadi, lekin backend ishlayapti)"
fi
echo ""

# 12. Nginx reload
echo "🌐 Nginx'ni qayta yuklash..."
systemctl reload nginx
echo "✅ Nginx qayta yuklandi"
echo ""

echo "✅ Backend to'liq sozlandi va ishga tushirildi!"
echo ""
echo "📊 Tekshirish:"
echo "   PM2: pm2 status"
echo "   Logs: pm2 logs prodeklarant-backend"
echo "   Health: curl http://localhost:3001/health"
echo "   Nginx: systemctl status nginx"
echo ""
echo "🌐 Dastur: http://138.249.7.15"

