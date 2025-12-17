# VPS'da Build Qilish - Qadamlar

## 1. To'g'ri papkaga kiring

```bash
cd /var/www/prodeklarant/backend
```

## 2. Yangi o'zgarishlarni yuklab oling

```bash
git pull origin main
```

## 3. Dependencies'ni yangilang (agar kerak bo'lsa)

```bash
npm install
```

## 4. Build qiling

```bash
npm run build
```

## 5. Backend'ni qayta ishga tushiring

```bash
pm2 restart prodeklarant-backend
```

## 6. Loglarni tekshiring

```bash
pm2 logs prodeklarant-backend
```

## To'liq qayta o'rnatish (agar kerak bo'lsa)

```bash
cd /var/www/prodeklarant
git pull origin main
cd backend
npm install
npm run build
pm2 restart prodeklarant-backend
pm2 logs prodeklarant-backend --lines 50
```

