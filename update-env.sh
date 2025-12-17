#!/bin/bash

# Environment sozlamalarini yangilash script'i

set -e

echo "🔐 Environment sozlamalarini yangilash..."

cd /var/www/prodeklarant/backend

# .env faylini tekshirish
if [ ! -f .env ]; then
    echo "❌ .env fayli topilmadi!"
    echo "📝 .env faylini yaratish..."
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    
    cat > .env << EOF
DATABASE_URL="postgresql://prodeklarant:${DB_PASSWORD}@localhost:5432/prodeklarant?schema=public"
JWT_SECRET="${JWT_SECRET}"
PORT=3001
NODE_ENV=production
EOF
    
    echo "✅ .env fayli yaratildi!"
    echo "📋 Database Password: $DB_PASSWORD"
    echo "📋 JWT Secret: $JWT_SECRET"
    echo "⚠️  Bu ma'lumotlarni saqlab qo'ying!"
    
    # Database user va password'ni yangilash
    echo ""
    echo "🔄 Database user parolini yangilash..."
    sudo -u postgres psql -c "DROP USER IF EXISTS prodeklarant;" || true
    sudo -u postgres psql -c "CREATE USER prodeklarant WITH PASSWORD '${DB_PASSWORD}';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE prodeklarant TO prodeklarant;"
    
    echo "✅ Database paroli yangilandi!"
else
    echo "✅ .env fayli mavjud"
    echo ""
    echo "📝 Hozirgi .env fayli:"
    cat .env
    echo ""
    read -p "O'zgartirishni davom etasizmi? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Bekor qilindi."
        exit 0
    fi
    
    # Generate new passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    
    # Backup old .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Eski .env fayli backup qilindi"
    
    # Update .env
    cat > .env << EOF
DATABASE_URL="postgresql://prodeklarant:${DB_PASSWORD}@localhost:5432/prodeklarant?schema=public"
JWT_SECRET="${JWT_SECRET}"
PORT=3001
NODE_ENV=production
EOF
    
    echo "✅ .env fayli yangilandi!"
    echo "📋 Yangi Database Password: $DB_PASSWORD"
    echo "📋 Yangi JWT Secret: $JWT_SECRET"
    echo "⚠️  Bu ma'lumotlarni saqlab qo'ying!"
    
    # Update database password
    echo ""
    echo "🔄 Database user parolini yangilash..."
    sudo -u postgres psql -c "ALTER USER prodeklarant WITH PASSWORD '${DB_PASSWORD}';"
    echo "✅ Database paroli yangilandi!"
fi

# Frontend .env
echo ""
echo "🔧 Frontend .env faylini tekshirish..."
cd ../frontend
if [ ! -f .env ]; then
    cat > .env << EOF
VITE_API_URL=http://138.249.7.15:3001/api
EOF
    echo "✅ Frontend .env fayli yaratildi!"
else
    echo "✅ Frontend .env fayli mavjud"
fi

# Restart services
echo ""
echo "🔄 Servicelarni qayta ishga tushirish..."
cd ../backend

# PM2 restart
if pm2 list | grep -q "prodeklarant-backend"; then
    pm2 restart prodeklarant-backend
    echo "✅ Backend qayta ishga tushirildi"
else
    if [ -f "dist/server.js" ]; then
        pm2 start dist/server.js --name prodeklarant-backend
        pm2 save
        echo "✅ Backend ishga tushirildi"
    else
        echo "⚠️  dist/server.js topilmadi. Avval build qiling!"
    fi
fi

# Nginx reload
systemctl reload nginx
echo "✅ Nginx qayta yuklandi"

echo ""
echo "✅ Barcha sozlamalar yangilandi!"
echo ""
echo "📊 Tekshirish:"
echo "   PM2 Status: pm2 status"
echo "   PM2 Logs: pm2 logs prodeklarant-backend"
echo "   Nginx Status: systemctl status nginx"

