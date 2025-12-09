# Tezkor Boshlash Ko'rsatmasi

## 1. PostgreSQL O'rnatish

### Windows uchun:

1. **PostgreSQL yuklab oling:**
   - https://www.postgresql.org/download/windows/
   - "Download the installer" ni bosing
   - Windows x64 versiyasini yuklab oling

2. **O'rnatish:**
   - Installer'ni ishga tushiring
   - "Next" bosib o'ting
   - Installation Directory: default (C:\Program Files\PostgreSQL\16)
   - Data Directory: default
   - **Password:** `postgres` yoki o'zingiz tanlagan parol (eslab qoling!)
   - Port: `5432` (default)
   - Locale: default
   - O'rnatishni yakunlang

3. **Database yaratish:**
   - **pgAdmin** ochiladi (PostgreSQL bilan birga keladi)
   - Yoki Command Prompt'da:
     ```powershell
     cd "C:\Program Files\PostgreSQL\16\bin"
     .\psql.exe -U postgres
     ```
   - Parolni kiriting (o'rnatishda kiritgan parol)
   - SQL buyruqlarini bajaring:
     ```sql
     CREATE DATABASE prodeklarant;
     CREATE USER app WITH PASSWORD 'app';
     GRANT ALL PRIVILEGES ON DATABASE prodeklarant TO app;
     \q
     ```

4. **Backend .env faylini yangilang:**
   - `backend/.env` faylida:
     ```
     DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/prodeklarant?schema=public
     ```
   - `YOUR_PASSWORD` o'rniga PostgreSQL superuser parolini yozing

5. **Migrate va Seed:**
   ```bash
   cd backend
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```

## 2. Login Ma'lumotlari

Database seed qilingandan keyin:

- **Email:** `admin@local.test`
- **Parol:** `admin123`

## 3. Serverlarni Ishga Tushirish

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## 4. Dasturdan Foydalanish

1. Browser'da: `http://localhost:5173`
2. Login: `admin@local.test` / `admin123`
3. Dashboard → Tasks → Clients → Transactions

---

**Muammo bo'lsa:** `DATABASE_SETUP.md` faylida batafsil ko'rsatmalar bor.

