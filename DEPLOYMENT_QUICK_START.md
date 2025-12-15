# Tezkor Deployment Qo'llanmasi

## Asosiy Qadamlari

### 1. Serverga Tayanch Dasturlarni O'rnatish

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql

# Nginx
sudo apt install nginx -y

# PM2
sudo npm install -g pm2
```

### 2. Dasturni Serverga Yuklash

```bash
cd /var/www
sudo git clone https://github.com/oybek94/Prodeklarant_taskmanager.git prodeklarant
cd prodeklarant
```

### 3. Database Yaratish

```bash
sudo -u postgres psql
```

PostgreSQL ichida:
```sql
CREATE DATABASE prodeklarant;
CREATE USER app WITH PASSWORD 'KuchliParol123!';
GRANT ALL PRIVILEGES ON DATABASE prodeklarant TO app;
ALTER USER app CREATEDB;
\q
```

### 4. Backend Sozlash

```bash
cd /var/www/prodeklarant/backend

# .env faylini yaratish
nano .env
```

`.env` faylida:
```env
DATABASE_URL=postgresql://app:KuchliParol123!@localhost:5432/prodeklarant?schema=public
PORT=3001
NODE_ENV=production
JWT_SECRET=juda-kuchli-secret-key-minimum-32-simvol
JWT_REFRESH_SECRET=juda-kuchli-refresh-secret-key-minimum-32-simvol
ALLOWED_ORIGINS=https://prodeklarant.example.com,https://www.prodeklarant.example.com
```

```bash
# Dependency va build
npm install --production
npm run build
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed

# PM2 orqali ishga tushirish
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 5. Frontend Sozlash

```bash
cd /var/www/prodeklarant/frontend

# .env.production faylini yaratish
nano .env.production
```

`.env.production` faylida:
```env
VITE_API_BASE_URL=https://prodeklarant.example.com/api
```

```bash
npm install
npm run build
```

### 6. Nginx Sozlash

```bash
sudo nano /etc/nginx/sites-available/prodeklarant
```

Quyidagi konfiguratsiyani yozing (domeningizni o'zgartiring):

```nginx
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

server {
    listen 443 ssl http2;
    server_name prodeklarant.example.com www.prodeklarant.example.com;

    ssl_certificate /etc/letsencrypt/live/prodeklarant.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prodeklarant.example.com/privkey.pem;
    
    root /var/www/prodeklarant/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

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
}
```

```bash
sudo ln -s /etc/nginx/sites-available/prodeklarant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Sertifikat

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d prodeklarant.example.com -d www.prodeklarant.example.com
```

### 8. Domain DNS

DNS sozlamalarida:
```
Type: A
Name: @ (yoki prodeklarant)
Value: SERVER_IP
TTL: 3600
```

## Tekshirish

- Backend: `curl http://localhost:3001/health`
- Frontend: `https://prodeklarant.example.com`
- PM2: `pm2 status`

## Yangilash

```bash
cd /var/www/prodeklarant
git pull
cd backend && npm install --production && npm run build && pm2 restart prodeklarant-backend
cd ../frontend && npm install && npm run build
```

---

**Batafsil ma'lumot:** `PRODUCTION_DEPLOYMENT.md` faylida


