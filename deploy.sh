#!/bin/bash

# VPS Deployment Script for Prodeklarant
# Ubuntu 24.04

set -e

echo "🚀 Starting deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Install Nginx
echo "📦 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
fi

# Install PM2
echo "📦 Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Create application directory
echo "📁 Creating application directory..."
APP_DIR="/var/www/prodeklarant"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Clone or update repository
echo "📥 Cloning repository..."
cd $APP_DIR
if [ -d ".git" ]; then
    echo "Repository exists, pulling latest changes..."
    git pull origin main
else
    git clone https://github.com/oybek94/Prodeklarant_taskmanager.git .
fi

# Setup Backend
echo "🔧 Setting up backend..."
cd backend
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    
    cat > .env << EOF
DATABASE_URL="postgresql://prodeklarant:${DB_PASSWORD}@localhost:5432/prodeklarant?schema=public"
JWT_SECRET="${JWT_SECRET}"
PORT=3001
NODE_ENV=production
EOF
    echo "✅ .env file created with secure credentials!"
    echo "📋 Database Password: $DB_PASSWORD"
    echo "📋 JWT Secret: $JWT_SECRET"
    echo "⚠️  Please save these credentials securely!"
fi

# Setup database
echo "🗄️  Setting up database..."
# .env faylidan parolni o'qish
DB_PASSWORD=$(grep DATABASE_URL .env | sed 's/.*:\([^@]*\)@.*/\1/' | tr -d '"')

# Eski user va database'ni o'chirish (agar mavjud bo'lsa)
sudo -u postgres psql -c "DROP DATABASE IF EXISTS prodeklarant;" || true
sudo -u postgres psql -c "DROP USER IF EXISTS prodeklarant;" || true

# Yangi user va database yaratish
sudo -u postgres psql -c "CREATE USER prodeklarant WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -c "CREATE DATABASE prodeklarant OWNER prodeklarant;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE prodeklarant TO prodeklarant;"

# Run migrations
echo "🔄 Running database migrations..."
npx prisma generate
npx prisma db push

# Build backend
echo "🏗️  Building backend..."
npm run build

# Setup Frontend
echo "🔧 Setting up frontend..."
cd ../frontend
npm install

# Create .env file for frontend
if [ ! -f .env ]; then
    echo "Creating frontend .env file..."
    cat > .env << EOF
VITE_API_BASE_URL=http://138.249.7.15/api
EOF
fi

# Build frontend
echo "🏗️  Building frontend..."
npm run build

# Setup PM2
echo "🔄 Setting up PM2..."
cd ../backend
pm2 delete prodeklarant-backend || true
pm2 start dist/server.js --name prodeklarant-backend
pm2 save
pm2 startup

# Setup Nginx
echo "🌐 Setting up Nginx..."
sudo tee /etc/nginx/sites-available/prodeklarant > /dev/null <<EOF
server {
    listen 80;
    server_name 138.249.7.15;

    # Frontend
    location / {
        root /var/www/prodeklarant/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Uploads
    location /api/uploads {
        alias /var/www/prodeklarant/backend/uploads;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/prodeklarant /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p /var/www/prodeklarant/backend/uploads/documents
chmod -R 755 /var/www/prodeklarant/backend/uploads

echo "✅ Deployment completed!"
echo "🌐 Access your application at: http://138.249.7.15"
echo "📝 Don't forget to:"
echo "   1. Update .env files with your actual credentials"
echo "   2. Update JWT_SECRET in backend/.env"
echo "   3. Update DATABASE_URL in backend/.env"
echo "   4. Restart services: pm2 restart prodeklarant-backend && sudo systemctl reload nginx"

