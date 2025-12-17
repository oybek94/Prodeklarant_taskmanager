#!/bin/bash

# Prisma schema faylini to'g'rilash

set -e

echo "🔧 Prisma schema faylini to'g'rilash..."
echo ""

cd /var/www/prodeklarant/backend

# 1. Eski schema faylini backup qilish
echo "💾 Eski schema faylini backup qilish..."
if [ -f "prisma/schema.prisma" ]; then
    cp prisma/schema.prisma prisma/schema.prisma.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup yaratildi"
fi
echo ""

# 2. GitHub'dan to'g'ri schema faylini olish
echo "📥 GitHub'dan to'g'ri schema faylini olish..."
cd prisma
wget -O schema.prisma https://raw.githubusercontent.com/oybek94/Prodeklarant_taskmanager/main/backend/prisma/schema.prisma

# 3. Schema faylini tekshirish
echo "📋 Schema faylini tekshirish..."
if [ -f "schema.prisma" ]; then
    echo "✅ Schema fayli yuklandi"
    echo "📏 Fayl hajmi:"
    ls -lh schema.prisma
    echo ""
    echo "📝 Fayl boshidagi birinchi 10 qator:"
    head -10 schema.prisma
else
    echo "❌ Schema fayli yuklanmadi!"
    exit 1
fi
echo ""

# 4. Prisma generate
echo "🔧 Prisma client'ni generate qilish..."
cd ..
npx prisma generate

# 5. Prisma client'ni tekshirish
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


