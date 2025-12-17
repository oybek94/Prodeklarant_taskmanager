#!/bin/bash

# Lokal o'zgarishlarni tozalash va yangi kodlarni olish

set -e

echo "🧹 Lokal o'zgarishlarni tozalash..."
echo ""

cd /var/www/prodeklarant

# 1. Backend papkasidagi untracked script fayllarini o'chirish
echo "🗑️  Untracked script fayllarini o'chirish..."
cd backend
rm -f check-and-fix-backend.sh complete-setup.sh fix-frontend-env.sh fix-prisma-schema.sh full-backend-setup.sh rebuild-backend.sh update-env.sh 2>/dev/null || true
echo "✅ Script fayllari o'chirildi"
echo ""

# 2. package.json'dagi lokal o'zgarishlarni stash qilish
echo "💾 package.json'dagi lokal o'zgarishlarni stash qilish..."
git stash push -m "Local changes before pull" backend/package.json 2>/dev/null || true
echo "✅ O'zgarishlar stash qilindi"
echo ""

# 3. Barcha lokal o'zgarishlarni stash qilish
echo "💾 Barcha lokal o'zgarishlarni stash qilish..."
git stash push -m "Local changes before pull" 2>/dev/null || true
echo "✅ O'zgarishlar stash qilindi"
echo ""

# 4. Git pull
echo "📥 Yangi kodlarni olish..."
cd /var/www/prodeklarant
git pull origin main
echo "✅ Yangi kodlar olindi"
echo ""

# 5. Build qilish
echo "🏗️  Build qilinmoqda..."
cd backend
npm run build

# 6. Build tekshirish
if [ ! -f "dist/index.js" ] && [ ! -f "dist/src/server.js" ] && [ ! -f "dist/server.js" ]; then
    echo "❌ Build xatolik! Server fayli yaratilmadi."
    echo "📝 Xatolik xabari:"
    npm run build 2>&1 | tail -50
    exit 1
fi

echo "✅ Build muvaffaqiyatli!"
echo ""

# 7. Server faylini topish
if [ -f "dist/index.js" ]; then
    SERVER_FILE="dist/index.js"
elif [ -f "dist/src/server.js" ]; then
    SERVER_FILE="dist/src/server.js"
elif [ -f "dist/server.js" ]; then
    SERVER_FILE="dist/server.js"
else
    echo "❌ Server fayli topilmadi!"
    find dist -name "*.js" -type f | head -5
    exit 1
fi

echo "✅ Server fayli topildi: $SERVER_FILE"
echo ""

# 8. PM2'ni qayta ishga tushirish
echo "🔄 Backend'ni qayta ishga tushirish..."
pm2 restart prodeklarant-backend || pm2 start "$SERVER_FILE" --name prodeklarant-backend
pm2 save
echo "✅ Backend qayta ishga tushirildi"
echo ""

# 9. Tekshirish
echo "📊 PM2 Status:"
pm2 status
echo ""

echo "✅ Barcha jarayonlar yakunlandi!"
echo ""
echo "📝 Backend loglari:"
echo "   pm2 logs prodeklarant-backend --lines 30"
echo ""
echo "🧪 Health check:"
echo "   curl http://localhost:3001/health"


