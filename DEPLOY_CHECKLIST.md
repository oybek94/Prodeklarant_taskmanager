# Server Deployment Checklist

## Muammo: Localhostda ishlayapti, serverda ishlamayapti

### Ehtimoliy sabablar:

1. **TypeScript kod compile qilinmagan**
   - Serverda `dist/` papkasida eski JavaScript kod ishlayapti
   - Yangi o'zgarishlar faqat TypeScript fayllarda (`src/`)

2. **PM2 restart qilinmagan**
   - Yangi build qilinganidan keyin PM2 ni qayta ishga tushirish kerak

3. **Database ma'lumotlari farqi**
   - Serverdagi database'da snapshot maydonlari null bo'lishi mumkin

## Yechim:

### 1. Serverda kodni compile qilish

```bash
cd /var/www/app/backend
npm run build
```

Yoki manual:
```bash
cd /var/www/app/backend
tsc
mkdir -p dist/fonts
cp -r src/fonts/* dist/fonts/ 2>/dev/null || true
```

### 2. PM2 ni restart qilish

```bash
pm2 restart prodeklarant-backend
```

Yoki:
```bash
pm2 restart all
```

### 3. PM2 loglarini tekshirish

```bash
pm2 logs prodeklarant-backend --lines 50
```

Yoki:
```bash
tail -f /var/www/app/backend/logs/pm2-out.log
tail -f /var/www/app/backend/logs/pm2-error.log
```

### 4. Debug loglarni tekshirish

Dashboard'da sof foyda hisoblashda quyidagi loglar ko'rinadi:
```
[Dashboard] sumNetProfitForRange: Found X completed tasks...
[Dashboard] Task X: baseDealAmount=..., netProfit=...
[Dashboard] sumNetProfitForRange result: USD=... UZS=...
```

Agar bu loglar ko'rinmasa, yangi kod hali deploy qilinmagan.

### 5. dist/ papkasini tekshirish

```bash
ls -la /var/www/app/backend/dist/routes/dashboard.js
```

Fayl oxirgi o'zgartirilgan sana bilan mos kelishi kerak.

### 6. To'liq deploy process

```bash
cd /var/www/app/backend

# 1. Kodni yangilash (git pull yoki manual)
git pull  # yoki fayllarni qo'lda ko'chirish

# 2. TypeScript kodini compile qilish
npm run build

# 3. PM2 ni restart qilish
pm2 restart prodeklarant-backend

# 4. Statusni tekshirish
pm2 status

# 5. Loglarni tekshirish
pm2 logs prodeklarant-backend --lines 20
```

## Muammo aniqlash:

### Sof foyda 0 ko'rsatilmoqda

1. Loglarni tekshiring:
   ```bash
   pm2 logs prodeklarant-backend | grep -i "dashboard\|sumNetProfit"
   ```

2. Database'dagi tasklarni tekshiring:
   ```sql
   SELECT id, status, "snapshotDealAmount", "snapshotPsrPrice", "snapshotCertificatePayment", "snapshotWorkerPrice", "snapshotCustomsPayment"
   FROM "Task"
   WHERE status IN ('TAYYOR', 'YAKUNLANDI')
   AND "createdAt" >= CURRENT_DATE
   LIMIT 10;
   ```

3. Agar `snapshotDealAmount` null bo'lsa, `client.dealAmount` ishlatiladi.

### Bugungi tasklar soni farqi

1. Vaqt mintaqasini tekshiring:
   ```bash
   date
   date -u
   ```

2. Database'dagi tasklarni tekshiring:
   ```sql
   SELECT COUNT(*) 
   FROM "Task"
   WHERE "createdAt" >= CURRENT_DATE;
   ```

## Xulosa:

**Asosiy muammo:** TypeScript kodlar compile qilinmagan yoki PM2 restart qilinmagan.

**Asosiy yechim:** Serverda `npm run build` ni ishga tushiring va PM2 ni restart qiling.
