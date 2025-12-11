# Database Setup Ko'rsatmasi

## PostgreSQL O'rnatish

### Variant 1: PostgreSQL Desktop (Windows)

1. PostgreSQL'ni yuklab oling: https://www.postgresql.org/download/windows/
2. O'rnatish jarayonida:
   - Port: `5432` (default)
   - Superuser password: `postgres` (yoki o'zingiz tanlagan parol)
3. O'rnatishdan keyin **pgAdmin** yoki **psql** orqali database yarating

### Variant 2: psql orqali (Command Line)

1. PostgreSQL o'rnatilgan bo'lishi kerak
2. PowerShell'da (yoki Command Prompt):
   ```powershell
   # PostgreSQL bin papkasiga kiring (odatda)
   cd "C:\Program Files\PostgreSQL\16\bin"
   
   # psql'ga kiring (parol so'raladi)
   .\psql.exe -U postgres
   ```
3. psql ichida:
   ```sql
   CREATE DATABASE prodeklarant;
   CREATE USER app WITH PASSWORD 'app';
   GRANT ALL PRIVILEGES ON DATABASE prodeklarant TO app;
   \q
   ```

### Variant 3: pgAdmin orqali (GUI)

1. pgAdmin'ni oching
2. Servers → PostgreSQL → Databases → Right click → Create → Database
3. Database name: `prodeklarant`
4. Keyin Users → Right click → Create → Login/Group Role
   - Name: `app`
   - Password: `app`
   - Privileges: Superuser yoki Database yoki kerakli huquqlar

## Database URL sozlash

`backend/.env` faylida:

```
DATABASE_URL=postgresql://app:app@localhost:5432/prodeklarant?schema=public
```

Agar PostgreSQL'da boshqa user/password bo'lsa:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/prodeklarant?schema=public
```

## Migrate va Seed

Database tayyor bo'lgandan keyin:

```bash
cd backend
npx prisma migrate dev --name init
npm run prisma:seed
```

## Tekshirish

```bash
npx prisma studio
```

Bu database'ni browser'da ko'rsatadi.

