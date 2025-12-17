# Tez Tuzatish - VPS'da Backend Build

## Muammo
Siz `/var/www/prodeklarant` papkasidasiz, lekin `package.json` `/var/www/prodeklarant/backend` papkasida.

## Yechim

```bash
# Backend papkasiga kiring
cd /var/www/prodeklarant/backend

# Build qiling
npm run build

# Tekshiring
ls -la dist/server.js

# Backend'ni ishga tushiring
pm2 start dist/server.js --name prodeklarant-backend
pm2 save

# Status'ni tekshiring
pm2 status
pm2 logs prodeklarant-backend
```

## To'liq qayta o'rnatish

```bash
# 1. To'g'ri papkaga kiring
cd /var/www/prodeklarant/backend

# 2. Dependencies'ni o'rnating/yangilang
npm install

# 3. Build qiling
npm run build

# 4. Backend'ni ishga tushiring
pm2 start dist/server.js --name prodeklarant-backend
pm2 save

# 5. Tekshiring
pm2 status
pm2 logs prodeklarant-backend --lines 50
```

