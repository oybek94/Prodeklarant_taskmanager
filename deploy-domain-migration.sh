#!/bin/bash
set -e

cd /var/www/app

echo "========================================="
echo "Domain Migration to app.prodeklarant.uz"
echo "========================================="

# Step 1: Update Nginx configuration
echo "[Step 1] Updating Nginx configuration..."
cat > /etc/nginx/sites-available/prodeklarant << 'NGINX_EOF'
# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name app.prodeklarant.uz 138.249.7.15;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name app.prodeklarant.uz;

    # SSL certificate paths (will be set by certbot)
    ssl_certificate /etc/letsencrypt/live/app.prodeklarant.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.prodeklarant.uz/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

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

# Test Nginx configuration
nginx -t && systemctl reload nginx
    echo "[OK] Nginx configuration updated"

# Step 2: Update Backend .env
echo "[Step 2] Updating backend .env..."
cd /var/www/app/backend
if [ -f .env ]; then
    # Backup existing .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update ALLOWED_ORIGINS
    if grep -q "ALLOWED_ORIGINS" .env; then
        sed -i 's|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://app.prodeklarant.uz,http://138.249.7.15,http://138.249.7.15:80|' .env
    else
        echo "ALLOWED_ORIGINS=https://app.prodeklarant.uz,http://138.249.7.15,http://138.249.7.15:80" >> .env
    fi
    echo "[OK] Backend .env updated"
    echo "ALLOWED_ORIGINS value:"
    grep ALLOWED_ORIGINS .env
else
    echo "[ERROR] Backend .env file not found!"
    exit 1
fi

# Step 3: Update Frontend .env.production
echo "[Step 3] Updating frontend .env.production..."
cd /var/www/app/frontend
cat > .env.production << 'EOF'
VITE_API_BASE_URL=https://app.prodeklarant.uz/api
EOF
echo "[OK] Frontend .env.production updated"
cat .env.production

# Step 4: Rebuild Frontend
echo "[Step 4] Rebuilding frontend..."
cd /var/www/app/frontend
npm run build
echo "[OK] Frontend rebuilt"

# Fix permissions
chown -R www-data:www-data /var/www/app/frontend/dist
chmod -R 755 /var/www/app/frontend/dist

# Step 5: Install Certbot and SSL Certificate
echo "[Step 5] Installing Certbot and SSL certificate..."
apt install -y certbot python3-certbot-nginx
mkdir -p /var/www/certbot

# Get SSL certificate
certbot --nginx -d app.prodeklarant.uz --non-interactive --agree-tos --email admin@prodeklarant.uz --redirect || {
    echo "[WARN] SSL certificate installation failed. Please run manually:"
    echo "certbot --nginx -d app.prodeklarant.uz"
}

# Reload Nginx
systemctl reload nginx
echo "[OK] SSL certificate configured"

# Step 6: Restart Backend
echo "[Step 6] Restarting backend..."
pm2 restart prodeklarant-backend --update-env
echo "[OK] Backend restarted"

# Step 7: Verification
echo "[Step 7] Verifying deployment..."
echo "Checking Nginx status..."
systemctl status nginx --no-pager | head -5
echo ""
echo "Checking PM2 status..."
pm2 status
echo ""
echo "Checking SSL certificate..."
if [ -f /etc/letsencrypt/live/app.prodeklarant.uz/fullchain.pem ]; then
    echo "[OK] SSL certificate exists"
    openssl x509 -in /etc/letsencrypt/live/app.prodeklarant.uz/fullchain.pem -noout -subject -dates
else
    echo "[WARN] SSL certificate not found"
fi

echo ""
echo "========================================="
echo "Deployment completed!"
echo "========================================="
echo "Please verify:"
echo "1. DNS: nslookup app.prodeklarant.uz"
echo "2. HTTP redirect: curl -I http://app.prodeklarant.uz"
echo "3. HTTPS: curl -I https://app.prodeklarant.uz"
echo "4. Visit: https://app.prodeklarant.uz"
