#!/bin/bash
# Update Nginx configuration to allow multiple file uploads (200MB total, each file max 100MB)
# Execute this on the server as root user

set -e

echo "========================================="
echo "Updating Nginx Upload Limit"
echo "========================================="

# Step 1: Backup current Nginx config
echo "[Step 1] Backing up current Nginx configuration..."
if [ -f /etc/nginx/sites-available/prodeklarant ]; then
    cp /etc/nginx/sites-available/prodeklarant /etc/nginx/sites-available/prodeklarant.backup.$(date +%Y%m%d_%H%M%S)
    echo "[OK] Backup created"
else
    echo "[WARN] Nginx config not found at /etc/nginx/sites-available/prodeklarant"
fi

# Step 2: Read current config and add client_max_body_size
echo "[Step 2] Updating Nginx configuration..."
if [ -f /etc/nginx/sites-available/prodeklarant ]; then
    # Check if client_max_body_size already exists
    if grep -q "client_max_body_size" /etc/nginx/sites-available/prodeklarant; then
        echo "[INFO] client_max_body_size already exists, updating to 200M..."
        # Update existing value to 200M
        sed -i 's/client_max_body_size.*/client_max_body_size 200M;/' /etc/nginx/sites-available/prodeklarant
    else
        echo "[INFO] Adding client_max_body_size..."
        # Add after server { line in HTTPS server block
        sed -i '/listen 443 ssl http2;/a\    client_max_body_size 200M;' /etc/nginx/sites-available/prodeklarant
        # Also add to HTTP server block if it exists
        if grep -q "listen 80;" /etc/nginx/sites-available/prodeklarant; then
            sed -i '/listen 80;/a\    client_max_body_size 200M;' /etc/nginx/sites-available/prodeklarant
        fi
    fi
    
    # Also add to /api location block for extra safety
    if ! grep -q "client_max_body_size" /etc/nginx/sites-available/prodeklarant | grep -A 5 "location /api"; then
        sed -i '/location \/api {/a\        client_max_body_size 200M;' /etc/nginx/sites-available/prodeklarant
    else
        # Update existing value in /api location block
        sed -i '/location \/api {/,/}/s/client_max_body_size.*/        client_max_body_size 200M;/' /etc/nginx/sites-available/prodeklarant
    fi
    
    echo "[OK] Configuration updated"
else
    echo "[ERROR] Nginx config file not found!"
    exit 1
fi

# Step 3: Test Nginx configuration
echo "[Step 3] Testing Nginx configuration..."
if nginx -t; then
    echo "[OK] Nginx configuration is valid"
else
    echo "[ERROR] Nginx configuration test failed!"
    echo "Restoring backup..."
    if [ -f /etc/nginx/sites-available/prodeklarant.backup.* ]; then
        cp /etc/nginx/sites-available/prodeklarant.backup.* /etc/nginx/sites-available/prodeklarant
    fi
    exit 1
fi

# Step 4: Reload Nginx
echo "[Step 4] Reloading Nginx..."
systemctl reload nginx
echo "[OK] Nginx reloaded"

echo "========================================="
echo "Update completed!"
echo "========================================="
echo "Nginx now allows file uploads up to 200MB total (for multiple files)"
echo "Each individual file can be up to 100MB"
echo "Test: Try uploading multiple files through the application"


