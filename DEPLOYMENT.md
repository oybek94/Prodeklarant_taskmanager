# VPS Deployment Guide

## Server Information
- **OS**: Ubuntu 24.04
- **IP**: 138.249.7.15
- **Resources**: 1 vCPU / 1GB RAM / 20GB Storage

## Step 1: Connect to VPS

```bash
ssh root@138.249.7.15
# Password: oD7yY9mL8wlG
```

## Step 2: Upload and Run Deployment Script

### Option A: Using SCP (from your local machine)

```bash
# Upload deployment script
scp deploy.sh root@138.249.7.15:/root/

# Connect to server
ssh root@138.249.7.15

# Make script executable and run
chmod +x deploy.sh
./deploy.sh
```

### Option B: Manual Steps

#### 1. Update System
```bash
apt update && apt upgrade -y
```

#### 2. Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Should show v20.x
```

#### 3. Install PostgreSQL
```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

#### 4. Install Nginx
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

#### 5. Install PM2
```bash
npm install -g pm2
```

#### 6. Clone Repository
```bash
mkdir -p /var/www/prodeklarant
cd /var/www/prodeklarant
git clone https://github.com/oybek94/Prodeklarant_taskmanager.git .
```

#### 7. Setup Backend
```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://prodeklarant:YOUR_PASSWORD@localhost:5432/prodeklarant?schema=public"
JWT_SECRET="CHANGE_THIS_TO_A_SECURE_RANDOM_STRING"
PORT=3001
NODE_ENV=production
EOF

# Setup database
sudo -u postgres psql -c "CREATE USER prodeklarant WITH PASSWORD 'YOUR_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE prodeklarant OWNER prodeklarant;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE prodeklarant TO prodeklarant;"

# Run migrations
npx prisma generate
npx prisma db push

# Build
npm run build
```

#### 8. Setup Frontend
```bash
cd ../frontend
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://138.249.7.15:3001/api
EOF

# Build
npm run build
```

#### 9. Start Backend with PM2
```bash
cd ../backend
pm2 start dist/server.js --name prodeklarant-backend
pm2 save
pm2 startup
```

#### 10. Configure Nginx
```bash
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
systemctl reload nginx
```

#### 11. Create Uploads Directory
```bash
mkdir -p /var/www/prodeklarant/backend/uploads/documents
chmod -R 755 /var/www/prodeklarant/backend/uploads
```

## Step 3: Important Security Settings

### 1. Update Database Password
```bash
# Generate a strong password
openssl rand -base64 32

# Update PostgreSQL user password
sudo -u postgres psql -c "ALTER USER prodeklarant WITH PASSWORD 'YOUR_STRONG_PASSWORD';"

# Update backend/.env file
nano /var/www/prodeklarant/backend/.env
```

### 2. Update JWT Secret
```bash
# Generate a secure JWT secret
openssl rand -base64 64

# Update backend/.env file
nano /var/www/prodeklarant/backend/.env
```

### 3. Firewall Configuration
```bash
# Install UFW if not installed
apt install -y ufw

# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

## Step 4: Verify Deployment

1. Check PM2 status:
```bash
pm2 status
pm2 logs prodeklarant-backend
```

2. Check Nginx status:
```bash
systemctl status nginx
```

3. Check PostgreSQL status:
```bash
systemctl status postgresql
```

4. Test in browser:
- Open: http://138.249.7.15

## Useful Commands

### Restart Services
```bash
# Restart backend
pm2 restart prodeklarant-backend

# Restart Nginx
systemctl restart nginx

# Restart PostgreSQL
systemctl restart postgresql
```

### View Logs
```bash
# Backend logs
pm2 logs prodeklarant-backend

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Update Application
```bash
cd /var/www/prodeklarant
git pull origin main
cd backend
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart prodeklarant-backend
cd ../frontend
npm install
npm run build
systemctl reload nginx
```

## Troubleshooting

### Backend not starting
```bash
# Check logs
pm2 logs prodeklarant-backend

# Check if port is in use
netstat -tulpn | grep 3001

# Check .env file
cat /var/www/prodeklarant/backend/.env
```

### Database connection issues
```bash
# Test PostgreSQL connection
sudo -u postgres psql -c "\l"
sudo -u postgres psql -d prodeklarant -c "\dt"
```

### Nginx issues
```bash
# Test configuration
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log
```

