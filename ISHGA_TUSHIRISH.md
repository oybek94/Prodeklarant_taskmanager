# Dasturni Ishga Tushirish Ko'rsatmasi

## 1-qadam: Backend o'rnatish va ishga tushirish

Terminalda (PowerShell yoki Command Prompt) quyidagi buyruqlarni bajaring:

```bash
# Backend papkasiga kiring
cd backend

# Kutubxonalarni o'rnating
npm install

# Backend serverni ishga tushiring
npm run dev
```

Backend server `http://localhost:3001` da ishlaydi. Terminalda "Server running on http://localhost:3001" xabari ko'rinadi.

## 2-qadam: Frontend o'rnatish va ishga tushirish

**YANGI TERMINAL OCHING** (backend ishlab turgan terminalni yopmasdan) va quyidagi buyruqlarni bajaring:

```bash
# Frontend papkasiga kiring
cd frontend

# Kutubxonalarni o'rnating
npm install

# Frontend serverni ishga tushiring
npm run dev
```

Frontend `http://localhost:3000` da ishlaydi. Terminalda ko'rsatilgan manzilni brauzerda oching (odatda `http://localhost:3000`).

## 3-qadam: Dasturdan foydalanish

1. Brauzerda `http://localhost:3000` ni oching
2. "Yangi hujjat" tugmasini bosing
3. Fura raqami, mijoz nomi va filialni kiriting
4. Hujjat yaratiladi va barcha bosqichlar avtomatik yaratiladi
5. Har bir bosqich uchun:
   - Javobgar xodimni tanlang
   - "Boshlash" tugmasini bosing
   - "Yakunlash" tugmasini bosing
   - Vaqt avtomatik hisoblanadi

## Muhim eslatmalar:

- Backend va frontend ikkalasi ham bir vaqtning o'zida ishlashi kerak
- Agar biror xatolik bo'lsa, terminaldagi xabarlarni tekshiring
- Ma'lumotlar bazasi `backend/database.db` faylida saqlanadi

## To'xtatish:

- Terminalda `Ctrl + C` bosing (har ikkala terminalda)

