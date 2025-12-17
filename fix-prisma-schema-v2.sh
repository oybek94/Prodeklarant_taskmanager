#!/bin/bash

# Prisma schema faylini to'liq to'g'rilash

set -e

echo "🔧 Prisma schema faylini to'liq to'g'rilash..."
echo ""

cd /var/www/prodeklarant/backend

# 1. Eski schema faylini backup qilish
echo "💾 Eski schema faylini backup qilish..."
if [ -f "prisma/schema.prisma" ]; then
    cp prisma/schema.prisma prisma/schema.prisma.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup yaratildi"
fi
echo ""

# 2. Eski faylni o'chirish
echo "🗑️  Eski schema faylini o'chirish..."
rm -f prisma/schema.prisma
echo ""

# 3. GitHub'dan to'g'ri schema faylini olish
echo "📥 GitHub'dan to'g'ri schema faylini olish..."
cd prisma
wget -q -O schema.prisma https://raw.githubusercontent.com/oybek94/Prodeklarant_taskmanager/main/backend/prisma/schema.prisma

# 4. Schema faylini tekshirish
echo "📋 Schema faylini tekshirish..."
if [ ! -f "schema.prisma" ]; then
    echo "❌ Schema fayli yuklanmadi!"
    exit 1
fi

echo "✅ Schema fayli yuklandi"
echo "📏 Fayl hajmi:"
ls -lh schema.prisma
echo ""

# 5. Fayl boshidagi belgilarni tekshirish
echo "📝 Fayl boshidagi birinchi 5 qator (hex):"
head -5 schema.prisma | od -c | head -5
echo ""

echo "📝 Fayl boshidagi birinchi 10 qator:"
head -10 schema.prisma
echo ""

# 6. Fayl oxiridagi belgilarni tekshirish
echo "📝 Fayl oxiridagi oxirgi 5 qator:"
tail -5 schema.prisma
echo ""

# 7. Faylda noto'g'ri belgilar borligini tekshirish
echo "🔍 Noto'g'ri belgilarni tekshirish..."
if grep -q "npx prisma" schema.prisma || grep -q "^x$" schema.prisma; then
    echo "⚠️  Noto'g'ri belgilar topildi!"
    echo "📝 Noto'g'ri qatorlar:"
    grep -n "npx prisma\|^x$" schema.prisma || true
    echo ""
    echo "🔧 Noto'g'ri qatorlarni o'chirish..."
    sed -i '/^npx prisma/d' schema.prisma
    sed -i '/^x$/d' schema.prisma
    echo "✅ Noto'g'ri qatorlar o'chirildi"
else
    echo "✅ Noto'g'ri belgilar topilmadi"
fi
echo ""

# 8. Prisma validate
echo "✅ Prisma schema'ni validate qilish..."
cd ..
if npx prisma validate; then
    echo "✅ Schema to'g'ri!"
else
    echo "❌ Schema xatolik!"
    echo "📝 Xatolik xabari:"
    npx prisma validate 2>&1
    exit 1
fi
echo ""

# 9. Prisma generate
echo "🔧 Prisma client'ni generate qilish..."
npx prisma generate

# 10. Prisma client'ni tekshirish
echo "📁 Prisma client'ni tekshirish..."
if [ -f "node_modules/.prisma/client/index.js" ]; then
    echo "✅ Prisma client generate qilingan"
    ls -lh node_modules/.prisma/client/index.js
else
    echo "❌ Prisma client generate qilinmadi!"
    exit 1
fi
echo ""

echo "✅ Prisma schema to'g'rilandi va client generate qilindi!"
echo ""
echo "📊 Keyingi qadamlar:"
echo "   1. npm run build"
echo "   2. pm2 restart prodeklarant-backend"


