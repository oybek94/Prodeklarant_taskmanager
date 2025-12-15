# Production Deployment Ko'rsatmasi

Bu ko'rsatma dasturni o'z domeningizda ishga tushirish uchun batafsil qadamlarni ko'rsatadi.

## 1. Server Talablari

- **OS:** Ubuntu 20.04+ yoki boshqa Linux distributivlari
- **RAM:** Kamida 2GB (4GB+ tavsiya etiladi)
- **Disk:** Kamida 10GB bo'sh joy
- **Node.js:** v18+ yoki v20+
- **PostgreSQL:** 16+
- **Domain:** O'z domeningiz (masalan: `prodeklarant.example.com`)

## 2. Server O'rnatish

### 2.1. Node.js o'rnatish

```bash
# Node.js 20 LTS o'rnatish
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Tekshirish
node --version
npm --version
```

### 2.2. PostgreSQL o'rnatish

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# PostgreSQL'ni ishga tushirish
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.3. Nginx o'rnatish

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2.4. PM2 o'rnatish (Process Manager)

```bash
sudo npm install -g pm2
```

## 3. Dasturni Serverga Yuklash

### 3.1. Git orqali klonlash

```bash
cd /var/www
sudo git clone https://github.com/oybek94/Prodeklarant_taskmanager.git prodeklarant
cd prodeklarant
```

### 3.2. Dependency'larni o'rnatish

```bash
# Backend
cd backend
npm install --production
npm run build

# Frontend
cd ../frontend
npm install
npm run build
```

## 4. Database Sozlash

### 4.1. PostgreSQL Database yaratish

```bash
sudo -u postgres psql

# PostgreSQL ichida:
CREATE DATABASE prodeklarant;
CREATE USER app WITH PASSWORD 'KuchliParol123!';
GRANT ALL PRIVILEGES ON DATABASE prodeklarant TO app;
ALTER USER app CREATEDB;
\q
```

### 4.2. Backend .env faylini sozlash

```bash
cd /var/www/prodeklarant/backend
nano .env
```

`.env` faylida quyidagilarni yozing:

```env
DATABASE_URL=postgresql://app:KuchliParol123!@localhost:5432/prodeklarant?schema=public
PORT=3001
NODE_ENV=production
JWT_SECRET=juda-kuchli-va-xavfsiz-secret-key-minimum-32-simvol
JWT_REFRESH_SECRET=juda-kuchli-refresh-secret-key-minimum-32-simvol
```

**Muhim:** `JWT_SECRET` va `JWT_REFRESH_SECRET` ni o'zgartiring! Kuchli parol generator ishlatishingiz mumkin.

### 4.3. Migration va Seed

```bash
cd /var/www/prodeklarant/backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

## 5. Frontend Environment Variables

```bash
cd /var/www/prodeklarant/frontend
nano .env.production
```

`.env.production` faylida:

```env
VITE_API_BASE_URL=https://prodeklarant.example.com/api
```

**Eslatma:** `prodeklarant.example.com` o'rniga o'z domeningizni yozing.

Keyin frontend'ni build qiling:

```bash
npm run build
```

## 6. Backend CORS Sozlamalarini Yangilash

`backend/src/server.ts` faylini oching va CORS sozlamalarini yangilang:

```typescript
// CORS sozlamalari
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true
}));
```

Backend `.env` fayliga qo'shing:

```env
ALLOWED_ORIGINS=https://prodeklarant.example.com,https://www.prodeklarant.example.com
```

## 7. PM2 orqali Backend'ni Ishga Tushirish

```bash
cd /var/www/prodeklarant/backend

# PM2 ecosystem faylini yaratish
nano ecosystem.config.js
```

`ecosystem.config.js` faylida:

```javascript
module.exports = {
  apps: [{
    name: 'prodeklarant-backend',
    script: 'dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/pm2/prodeklarant-backend-error.log',
    out_file: '/var/log/pm2/prodeklarant-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M'
  }]
};
```

PM2'ni ishga tushirish:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 8. Nginx Konfiguratsiyasi

```bash
sudo nano /etc/nginx/sites-available/prodeklarant
```

Quyidagi konfiguratsiyani yozing (domeningizni o'zgartiring):

```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name prodeklarant.example.com www.prodeklarant.example.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name prodeklarant.example.com www.prodeklarant.example.com;

    # SSL sertifikatlar (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/prodeklarant.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prodeklarant.example.com/privkey.pem;
    
    # SSL sozlamalari
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend (Static files)
    root /var/www/prodeklarant/frontend/dist;
    index index.html;

    # Frontend routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Nginx'ni qayta yuklash:

```bash
sudo ln -s /etc/nginx/sites-available/prodeklarant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 9. SSL Sertifikat (Let's Encrypt)

```bash
# Certbot o'rnatish
sudo apt install certbot python3-certbot-nginx -y

# SSL sertifikat olish
sudo certbot --nginx -d prodeklarant.example.com -d www.prodeklarant.example.com

# Avtomatik yangilash
sudo certbot renew --dry-run
```

## 10. Firewall Sozlash

```bash
# UFW o'rnatish
sudo apt install ufw -y

# Firewall qoidalari
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 11. Domain DNS Sozlash

DNS sozlamalarida quyidagi record'larni qo'shing:

```
Type: A
Name: prodeklarant (yoki @)
Value: SERVER_IP_ADDRESS
TTL: 3600

Type: A
Name: www
Value: SERVER_IP_ADDRESS
TTL: 3600
```

## 12. Tekshirish

1. **Backend tekshirish:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Frontend tekshirish:**
   - Brauzerda: `https://prodeklarant.example.com`

3. **PM2 status:**
   ```bash
   pm2 status
   pm2 logs prodeklarant-backend
   ```

4. **Nginx loglar:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

## 13. Yangilash (Update)

Dasturni yangilash uchun:

```bash
cd /var/www/prodeklarant

# Yangi kodlarni olish
git pull origin main

# Backend yangilash
cd backend
npm install --production
npm run build
pm2 restart prodeklarant-backend

# Frontend yangilash
cd ../frontend
npm install
npm run build
# Nginx avtomatik yangi fayllarni ko'rsatadi
```

## 14. Backup

### Database backup

```bash
# Backup skript yaratish
sudo nano /usr/local/bin/backup-prodeklarant.sh
```

Skript ichida:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/prodeklarant"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U app prodeklarant > $BACKUP_DIR/db_$DATE.sql

# Eski backup'larni o'chirish (30 kundan eski)
find $BACKUP_DIR -name "db_*.sql" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql"
```

Cron job qo'shing:

```bash
sudo crontab -e
```

Qo'shing:

```
0 2 * * * /usr/local/bin/backup-prodeklarant.sh
```

## 15. Monitoring

PM2 monitoring:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 16. Xavfsizlik

1. **SSH sozlamalari:**
   - SSH key authentication
   - Password authentication o'chirish
   - Port o'zgartirish (22 emas)

2. **Fail2ban o'rnatish:**
   ```bash
   sudo apt install fail2ban -y
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

3. **Automatic security updates:**
   ```bash
   sudo apt install unattended-upgrades -y
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

## Muammo hal qilish

### Backend ishlamayapti

```bash
pm2 logs prodeklarant-backend
pm2 restart prodeklarant-backend
```

### Database ulanishi yo'q

```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

### Nginx xatoliklar

```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### SSL muammolari

```bash
sudo certbot certificates
sudo certbot renew
```

---

**Muvaffaqiyatlar tilaymiz!** 🚀


