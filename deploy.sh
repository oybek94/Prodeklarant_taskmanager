#!/bin/bash
set -e  # Exit on error

echo "========================================="
echo "Prodeklarant Deployment Script"
echo "========================================="

# Step 1: System Update
echo "[Step 1] Updating system..."
apt update && apt upgrade -y
echo "✓ System updated"

# Step 2: Install Core Dependencies
echo "[Step 2] Installing dependencies..."
apt install -y git curl build-essential

# Install Node.js LTS
echo "Installing Node.js LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
echo "Installing PM2..."
npm install -g pm2

# Install Nginx
echo "Installing Nginx..."
apt install -y nginx

# Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
echo "Installing Docker Compose..."
apt install -y docker-compose-plugin

echo "✓ Dependencies installed"
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "PM2 version: $(pm2 --version)"
echo "Docker version: $(docker --version)"

# Step 3: Create Project Directory
echo "[Step 3] Creating project directory..."
mkdir -p /var/www/app
chown -R $USER:$USER /var/www/app
echo "✓ Directory created"

# Step 4: Clone Repository
echo "[Step 4] Cloning repository..."
cd /var/www/app
if [ -d ".git" ]; then
    echo "Repository already exists, pulling latest changes..."
    git pull
else
    git clone https://github.com/oybek94/Prodeklarant_taskmanager .
fi
echo "✓ Repository cloned"

# Step 5: Database Setup
echo "[Step 5] Setting up database..."
docker-compose up -d db
echo "Waiting for database to be ready..."
sleep 10
docker ps | grep prodeklarant-db
echo "✓ Database container started"

# Step 6: Backend Configuration
echo "[Step 6] Configuring backend..."
cd /var/www/app/backend

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://app:app@localhost:5432/prodeklarant
PORT=3001
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
OPENAI_API_KEY=
ALLOWED_ORIGINS=http://138.249.7.15,http://138.249.7.15:80
EOF

echo "Installing backend dependencies..."
npm install

echo "Generating Prisma client..."
npm run prisma:generate

echo "Running migrations..."
npx prisma migrate deploy

echo "Building TypeScript..."
npm run build

echo "✓ Backend configured"

# Step 7: Frontend Configuration
echo "[Step 7] Configuring frontend..."
cd /var/www/app/frontend

# Create .env.production
cat > .env.production << EOF
VITE_API_BASE_URL=http://138.249.7.15/api
EOF

echo "Installing frontend dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "✓ Frontend configured"

# Step 8: Start Backend with PM2
echo "[Step 8] Starting backend with PM2..."
cd /var/www/app/backend
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root
echo "✓ Backend started with PM2"

# Step 9: Configure Nginx
echo "[Step 9] Configuring Nginx..."
cat > /etc/nginx/sites-available/prodeklarant << 'NGINX_EOF'
server {
    listen 80;
    server_name 138.249.7.15;

    # Frontend static files
    root /var/www/app/frontend/dist;
    index index.html;

    # API proxy
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

    # Uploads static files
    location /uploads {
        alias /var/www/app/backend/uploads;
    }

    # Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/prodeklarant /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo "✓ Nginx configured"

# Step 10: Firewall Configuration
echo "[Step 10] Configuring firewall..."
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw --force enable
echo "✓ Firewall configured"

# Step 11: Enable Services on Boot
echo "[Step 11] Enabling services on boot..."
systemctl enable nginx
systemctl enable docker
echo "✓ Services enabled on boot"

# Step 12: Verification
echo "[Step 12] Running verification..."
echo "Testing backend health endpoint..."
sleep 5
curl -f http://localhost:3001/health || echo "Backend health check failed"
echo ""
echo "Testing frontend..."
curl -f http://localhost/ || echo "Frontend check failed"
echo ""

echo "PM2 Status:"
pm2 status

echo "Docker Status:"
docker ps

echo "Nginx Status:"
systemctl status nginx --no-pager -l

echo "========================================="
echo "Deployment completed!"
echo "========================================="
echo "Application URL: http://138.249.7.15"
echo "API URL: http://138.249.7.15/api"
echo ""
echo "To check logs:"
echo "  Backend: pm2 logs prodeklarant-backend"
echo "  Nginx: tail -f /var/log/nginx/error.log"
echo "  Database: docker-compose logs db"

