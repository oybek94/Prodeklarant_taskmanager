#!/bin/bash
# Fix Nginx 403 Forbidden error
# Execute this on the server as root user

set -e

echo "========================================="
echo "Fixing Nginx 403 Forbidden Error"
echo "========================================="

# Step 1: Check if frontend/dist exists
echo "[Step 1] Checking frontend/dist directory..."
if [ ! -d "/var/www/app/frontend/dist" ]; then
    echo "ERROR: /var/www/app/frontend/dist does not exist!"
    echo "Building frontend..."
    cd /var/www/app/frontend
    npm install
    npm run build
    if [ ! -d "dist" ]; then
        echo "ERROR: Frontend build failed!"
        exit 1
    fi
else
    echo "[OK] Frontend dist directory exists"
fi

# Step 2: Fix file permissions
echo "[Step 2] Fixing file permissions..."
chown -R www-data:www-data /var/www/app/frontend/dist
chmod -R 755 /var/www/app/frontend/dist
chmod -R 755 /var/www/app/frontend
chmod -R 755 /var/www/app

# Ensure index.html is readable
if [ -f "/var/www/app/frontend/dist/index.html" ]; then
    chmod 644 /var/www/app/frontend/dist/index.html
    echo "[OK] index.html permissions fixed"
else
    echo "ERROR: index.html not found in dist directory!"
    exit 1
fi

# Step 3: Update Nginx configuration with proper permissions
echo "[Step 3] Updating Nginx configuration..."
cat > /etc/nginx/sites-available/prodeklarant << 'NGINX_EOF'
server {
    listen 80;
    server_name 138.249.7.15 _;

    # Frontend static files
    root /var/www/app/frontend/dist;
    index index.html;

    # Disable directory listing
    autoindex off;

    # Set proper permissions
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

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
        access_log off;
    }

    # Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINX_EOF

# Step 4: Test and reload Nginx
echo "[Step 4] Testing Nginx configuration..."
if nginx -t; then
    systemctl reload nginx
    echo "[OK] Nginx configuration updated and reloaded"
else
    echo "[FAIL] Nginx configuration error!"
    exit 1
fi

# Step 5: Check Nginx error logs
echo "[Step 5] Checking Nginx error logs..."
tail -n 20 /var/log/nginx/error.log | grep -i "403\|permission\|denied" || echo "No recent 403 errors in logs"

echo "========================================="
echo "Fix completed!"
echo "========================================="
echo "Test the site: curl http://localhost/"
echo "Check Nginx status: systemctl status nginx"
echo "Check Nginx logs: tail -f /var/log/nginx/error.log"

