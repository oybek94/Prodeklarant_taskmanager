#!/bin/bash

# Backend server status'ni tekshirish va tuzatish script'i

echo "🔍 Backend server status'ni tekshirish..."

# PM2 status
echo ""
echo "📊 PM2 Status:"
pm2 status

# Backend process'ni tekshirish
if pm2 list | grep -q "prodeklarant-backend"; then
    echo ""
    echo "✅ Backend process topildi!"
    echo ""
    echo "📝 Son loglar:"
    pm2 logs prodeklarant-backend --lines 20 --nostream
    
    echo ""
    echo "🔄 Backend'ni qayta ishga tushirish..."
    pm2 restart prodeklarant-backend
    sleep 2
    
    echo ""
    echo "📊 Yangi status:"
    pm2 status
else
    echo ""
    echo "❌ Backend process topilmadi!"
    echo ""
    echo "🚀 Backend'ni ishga tushirish..."
    cd /var/www/prodeklarant/backend
    
    # Build'ni tekshirish
    if [ ! -f "dist/server.js" ]; then
        echo "📦 Build qilinmoqda..."
        npm run build
    fi
    
    # Backend'ni ishga tushirish
    pm2 start dist/server.js --name prodeklarant-backend
    pm2 save
    
    echo ""
    echo "✅ Backend ishga tushirildi!"
    pm2 status
fi

# Port tekshirish
echo ""
echo "🔌 Port 3001 tekshirish:"
netstat -tulpn | grep 3001 || echo "Port 3001 ishlatilmayapti"

# Nginx status
echo ""
echo "🌐 Nginx Status:"
systemctl status nginx --no-pager -l | head -20

echo ""
echo "✅ Tekshirish yakunlandi!"


