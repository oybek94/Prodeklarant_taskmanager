# Prodeklarant - Task Tracker

Bojxona brokerlik korxonasi uchun fura hujjatlari boshqaruvi dasturi.

## Xususiyatlar

- ✅ Har bir fura hujjatini alohida ko'rsatish
- ✅ Hujjatning qaysi bosqichda ekanligini kuzatish
- ✅ Har bir bosqichni kim bajarganini belgilash
- ✅ Har bir bosqich uchun vaqt hisobi (boshlanish va tugash vaqti)
- ✅ Filiallar bo'yicha filtrlash (Toshkent va Oltiariq)
- ✅ Zamonaviy va qulay interfeys

## O'rnatish

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend server `http://localhost:3001` da ishlaydi.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend `http://localhost:3000` da ishlaydi.

## Ishlatish

1. Backend va frontend serverlarni ishga tushiring
2. Brauzerda `http://localhost:3000` ni oching
3. Yangi hujjat yaratish uchun "Yangi hujjat" tugmasini bosing
4. Fura raqami, mijoz nomi va filialni kiriting
5. Hujjat yaratilganda, avtomatik ravishda barcha bosqichlar yaratiladi:
   - Hujjat qabul qilish
   - Bojxona deklaratsiyasi
   - Yuk ko'chirish
   - Tekshiruv
   - Yakunlash

6. Har bir bosqich uchun:
   - Javobgar xodimni tanlang
   - "Boshlash" tugmasi bilan bosqichni boshlang
   - "Yakunlash" tugmasi bilan yakunlang
   - Vaqt avtomatik hisoblanadi

## Tashqi API Integratsiya

### My.gov.uz yoki boshqa tashqi API dan ma'lumot olish

1. **Backend da axios o'rnatish:**
```bash
cd backend
npm install axios
```

2. **Environment sozlamalari (.env fayl):**
```env
MYGOV_API_URL=https://api.my.gov.uz/api/v1
MYGOV_API_KEY=your-api-key-here
```

3. **Backend endpoint:**
- `GET /api/external/mygov-data` - My.gov.uz dan ma'lumot olish
- `GET /api/external/data-gov?datasetId=xxx` - Data.gov.uz dan ma'lumot olish
- `POST /api/external/proxy` - Umumiy proxy endpoint

4. **Frontend da ishlatish:**
```typescript
import apiClient from '../lib/api';

// My.gov.uz dan ma'lumot olish
const response = await apiClient.get('/external/mygov-data');
console.log(response.data);
```

**Mavjud API portallari:**
- [data.gov.uz](https://data.gov.uz) - Ochiq ma'lumotlar portali
- [api-portal.gov.uz](https://api-portal.gov.uz) - API portali

**Eslatma:** My.gov.uz ning ochiq API mavjudligi aniq emas. Rasmiy API hujjatlari uchun portalning qo'llab-quvvatlash xizmatiga murojaat qiling.

## Email (Send Task Documents by Mail.ru)

Completed tasks can send their documents by email via Mail.ru SMTP. See [SETUP_EMAIL.md](SETUP_EMAIL.md) for environment variables (e.g. `MAILRU_USER`, `MAILRU_PASSWORD`) and usage.

## Texnologiyalar

- **Backend**: Node.js, Express, TypeScript, SQLite
- **Frontend**: React, TypeScript, Tailwind CSS, Vite

## Ma'lumotlar bazasi

SQLite ma'lumotlar bazasi `backend/database.db` faylida saqlanadi.

## Ishchilar

Dastur ishga tushganda quyidagi ishchilar avtomatik yaratiladi:
- Direktor (Toshkent)
- Toshkent Xodimi 1
- Toshkent Xodimi 2
- Oltiariq Xodimi 1
- Oltiariq Xodimi 2

# Prodeklarant_taskmanager
# Prodeklarant_taskmanager
# Prodeklarant_taskmanager
# Prodeklarant_taskmanager
