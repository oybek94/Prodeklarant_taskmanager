#!/bin/bash

# Serverni tozalab, barcha jarayonlarni qayta o'rnatish script'i

set -e

echo "🧹 Serverni tozalash va qayta o'rnatish..."
echo "⚠️  Bu barcha mavjud kodlarni o'chirib tashlaydi!"
read -p "Davom etasizmi? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Bekor qilindi."
    exit 1
fi

# 1. PM2 process'larni to'xtatish va o'chirish
echo "🛑 PM2 process'larni to'xtatish..."
pm2 delete all || true
pm2 kill || true

# 2. Nginx'ni to'xtatish
echo "🛑 Nginx'ni to'xtatish..."
systemctl stop nginx || true

# 3. Eski application papkasini o'chirish
echo "🗑️  Eski application papkasini o'chirish..."
rm -rf /var/www/prodeklarant || true

# 4. Application papkasini yaratish
echo "📁 Application papkasini yaratish..."
mkdir -p /var/www/prodeklarant
cd /var/www/prodeklarant

# 5. Repository'ni klonlash
echo "📥 Repository'ni klonlash..."
git clone https://github.com/oybek94/Prodeklarant_taskmanager.git .

# 6. Backend setup
echo "🔧 Backend'ni sozlash..."
cd backend
npm install

# 7. Environment sozlash
echo "🔐 Environment sozlash..."
if [ ! -f .env ]; then
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
fi

# 8. Database setup
echo "🗄️  Database'ni sozlash..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS prodeklarant;" || true
sudo -u postgres psql -c "DROP USER IF EXISTS prodeklarant;" || true

# .env faylidan parolni o'qish
DB_PASSWORD=$(grep DATABASE_URL .env | sed 's/.*:\([^@]*\)@.*/\1/')

sudo -u postgres psql -c "CREATE USER prodeklarant WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -c "CREATE DATABASE prodeklarant OWNER prodeklarant;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE prodeklarant TO prodeklarant;"

# 9. Prisma migrations
echo "🔄 Database migrations..."
npx prisma generate
npx prisma db push

# 10. Build backend
echo "🏗️  Backend'ni build qilish..."
npm run build

# 11. Frontend setup
echo "🔧 Frontend'ni sozlash..."
cd ../frontend
npm install

# Frontend .env
if [ ! -f .env ]; then
    cat > .env << EOF
VITE_API_URL=http://138.249.7.15:3001/api
EOF
fi

# Build frontend
echo "🏗️  Frontend'ni build qilish..."
npm run build

# 12. Uploads papkasini yaratish
echo "📁 Uploads papkasini yaratish..."
mkdir -p /var/www/prodeklarant/backend/uploads/documents
chmod -R 755 /var/www/prodeklarant/backend/uploads

# 13. PM2'da backend'ni ishga tushirish
echo "🚀 Backend'ni PM2'da ishga tushirish..."
cd ../backend
pm2 start dist/server.js --name prodeklarant-backend
pm2 save
pm2 startup

# 14. Nginx sozlash
echo "🌐 Nginx'ni sozlash..."
cat > /etc/nginx/sites-available/prodeklarant << 'EOF'
server {
    listen 80;
    server_name 138.249.7.15;

    # Frontend
    location / {
        root /var/www/prodeklarant/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /api/uploads {
        alias /var/www/prodeklarant/backend/uploads;
    }
}
EOF

ln -sf /etc/nginx/sites-available/prodeklarant /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl start nginx
systemctl enable nginx

echo ""
echo "✅ Barcha jarayonlar muvaffaqiyatli yakunlandi!"
echo ""
echo "📊 Tekshirish:"
echo "   PM2 Status: pm2 status"
echo "   PM2 Logs: pm2 logs prodeklarant-backend"
echo "   Nginx Status: systemctl status nginx"
echo ""
echo "🌐 Dastur: http://138.249.7.15"
echo ""
echo "📝 Muhim ma'lumotlar:"
echo "   Backend .env: /var/www/prodeklarant/backend/.env"
echo "   Frontend .env: /var/www/prodeklarant/frontend/.env"

