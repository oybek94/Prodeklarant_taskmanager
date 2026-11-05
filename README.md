# Prodeklarant

Bojxona deklarantlari uchun CRM/ERP tizimi. Deklaratsiya jarayonlarini avtomatlashtirish — hujjatlar, bosqichlar va to'lovlarni yagona tizimda boshqarish.

## Imkoniyatlar

- Vazifalar (fura hujjatlari) va ularning bosqichlarini kuzatish
- Invoyslar, moliya va mijozlar boshqaruvi
- CRM va o'quv tizimi (LMS)
- Hisobotlar, KPI va gamifikatsiya
- AI yordamchi (hujjatlarni o'qish, tekshirish, tarjima)
- Real vaqt bildirishnomalari (Socket.IO)
- PDF / Excel eksport
- Chrome kengaytmasi — singlewindow.uz bilan integratsiya

## Texnologiyalar

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, React Router v7
- **Backend**: Express 5, TypeScript, Prisma ORM, PostgreSQL
- **Boshqa**: OpenAI API, Socket.IO, JWT, PDFKit, ExcelJS

## Tuzilma

```
backend/                  — API server (routes, services, ai, middleware)
frontend/                 — React ilova (pages, components, contexts)
singlewindow-extension/   — Chrome kengaytmasi (Manifest V3)
order-bot/                — Zakaz pochta boti
deploy/                   — Deploy skriptlari
```

Ma'lumotlar bazasi sxemasi: `backend/prisma/schema.prisma`.

## Ishga tushirish

Talablar: Node.js, PostgreSQL. Backend uchun `backend/.env` faylida `DATABASE_URL`, `JWT_SECRET` va boshqa o'zgaruvchilar sozlanadi (maxfiy kalitlar gitga tushmaydi).

```bash
# Backend — http://localhost:3001
cd backend
npm install
npx prisma migrate dev
npm run dev

# Frontend — http://localhost:5173
cd frontend
npm install
npm run dev
```

## Testlar

Postman kolleksiyasi Newman orqali ishga tushiriladi (CI: `.github/workflows/lms-integration-tests.yml`):

```bash
cd backend
npm run test:integration
```

Kolleksiya: `backend/openapi/`.
