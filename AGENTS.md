# Prodeklarant

Bojxona deklarantlari uchun CRM/ERP tizimi (O'zbekiston). Vazifalar, invoyslar, moliya, mijozlar, CRM, o'quv tizimi (LMS), hisobotlar va AI yordamchini o'z ichiga oladi. Chrome kengaytmasi singlewindow.uz bilan integratsiya qiladi.

## Maqsad

Deklaratsiya jarayonlarini avtomatlashtirish — hujjatlar, bosqichlar, to'lovlarni yagona tizimda boshqarish. KPI, gamifikatsiya va LMS orqali xodimlar samaradorligini oshirish.

## Texnologiyalar

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, React Router v7
- **Backend**: Express 5, TypeScript, Prisma ORM, PostgreSQL
- **AI**: OpenAI API | **Real-time**: Socket.IO | **Auth**: JWT + bcrypt
- **Eksport**: PDFKit, ExcelJS, @react-pdf/renderer | **Test**: Newman (Postman)

## Tuzilma

```
backend/   — src/routes/, src/services/, src/ai/, src/middleware/
frontend/  — src/pages/, src/components/, src/contexts/
singlewindow-extension/ — Chrome Extension (Manifest V3)
```

DB schema: `backend/prisma/schema.prisma` (yagona manba)

## Qoidalar

- TypeScript strict. `any` ishlatmaslik
- Validatsiya: Zod. Xatolar: `src/utils/error-handler.ts`
- Naming: o'zgaruvchilar camelCase, Prisma modellari PascalCase
- Valyuta: faqat `Decimal(12,2)`, hech qachon `number`
- Frontend sahifalar: `lazy(() => import(...))`
- Test: `npm run test:integration` (Newman, `backend/openapi/`)

## Chegaralar

- API kalitlar, tokenlar, DB parollari — faqat `.env` (`process.env.XXX`). Kodga yozish TAQIQLANADI
- `.env` fayllar gitga tushmasligi shart (`.gitignore`)
- Secretlarni log/console.log ga chiqarmaslik
- Parollar faqat `bcrypt` hash bilan saqlanadi
- SQL qo'lda yozilmaydi — faqat Prisma ORM
- Foydalanuvchi inputi — Zod bilan validatsiya qilinadi
- Frontendda `JWT_SECRET`, `DATABASE_URL` kabi maxfiy kalitlar ishlatilmaydi
- `rm -rf`, `DROP TABLE`, `DELETE FROM` — tasdiqlashsiz ISHLATILMAYDI

## Ishga tushirish

```bash
# Backend: localhost:3001
cd backend && npm install && npx prisma migrate dev && npm run dev

# Frontend: localhost:5173
cd frontend && npm install && npm run dev
```

## Eslatmalar

- Prisma schema o'zgarganda: `npx prisma migrate dev --name <nom>`
- Valyuta ishlari: `Currency` enum + `Decimal`
- Socket: server — `socketEmitter.ts`, client — `SocketContext.tsx`
