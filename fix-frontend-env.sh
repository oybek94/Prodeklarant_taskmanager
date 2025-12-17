#!/bin/bash

# Frontend .env faylini to'g'rilash

set -e

echo "🔧 Frontend .env faylini to'g'rilash..."

cd /var/www/prodeklarant/frontend

# .env faylini yaratish yoki yangilash
if [ ! -f .env ]; then
    echo "VITE_API_BASE_URL=http://138.249.7.15/api" > .env
    echo "✅ Frontend .env fayli yaratildi!"
else
    # Eski VITE_API_URL ni o'chirish
    sed -i '/VITE_API_URL/d' .env
    
    # VITE_API_BASE_URL ni yangilash yoki qo'shish
    if grep -q "VITE_API_BASE_URL" .env; then
        sed -i 's|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://138.249.7.15/api|' .env
        echo "✅ VITE_API_BASE_URL yangilandi!"
    else
        echo "VITE_API_BASE_URL=http://138.249.7.15/api" >> .env
        echo "✅ VITE_API_BASE_URL qo'shildi!"
    fi
fi

echo ""
echo "📋 Frontend .env fayli:"
cat .env

echo ""
echo "🔄 Frontend'ni qayta build qilish kerak:"
echo "   cd /var/www/prodeklarant/frontend"
echo "   npm run build"
echo "   systemctl reload nginx"

