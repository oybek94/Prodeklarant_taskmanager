# Local Database Permissions Tez Tuzatish

## Muammo
Localhost'da login qilishda database permissions xatoligi.

## Eng Tez Yechim

### Variant 1: Docker Desktop ishlatish

1. **Docker Desktop'ni ishga tushiring**
   - Start menu'dan "Docker Desktop" ni toping va ishga tushiring
   - Docker Desktop ishga tushguncha kuting (tray'da icon ko'rinishi kerak)

2. **Terminal'da quyidagi buyruqlarni bajaring:**

```powershell
cd G:\Prodeklarant
docker compose up -d db
```

3. **Container'ga ulaning va permissions berish:**

```powershell
docker exec -it prodeklarant-db psql -U app -d prodeklarant
```

4. **PostgreSQL'da quyidagi buyruqlarni bajaring:**

```sql
GRANT ALL PRIVILEGES ON TABLE "User" TO app;
GRANT ALL PRIVILEGES ON TABLE "User" TO postgres;
GRANT USAGE ON SCHEMA public TO app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app;
\q
```

### Variant 2: Server'dagi database'ga ulanish (Tavsiya etiladi)

Agar local database'da muammo bo'lsa, server'dagi database'ga ulanishni o'zgartiring:

1. **`backend/.env` faylini oching**

2. **`DATABASE_URL` ni o'zgartiring:**

```env
# Server'dagi database'ga ulanish
DATABASE_URL=postgresql://app:app@138.249.7.15:5432/prodeklarant

# Yoki local database bo'lsa
DATABASE_URL=postgresql://app:app@localhost:5432/prodeklarant
```

3. **Backend server'ni qayta ishga tushiring**

### Variant 3: PostgreSQL o'rnatish

Agar Docker ishlamasa:

1. PostgreSQL'ni o'rnating: https://www.postgresql.org/download/windows/
2. O'rnatishda parolni eslab qoling
3. Database yarating:
   ```sql
   CREATE DATABASE prodeklarant;
   CREATE USER app WITH PASSWORD 'app';
   GRANT ALL PRIVILEGES ON DATABASE prodeklarant TO app;
   ```
4. Prisma migrations'ni bajaring:
   ```powershell
   cd backend
   npx prisma migrate dev
   ```

## Tekshirish

Permissions o'rnatilganini tekshirish:

```powershell
docker exec -it prodeklarant-db psql -U app -d prodeklarant -c "SELECT table_name FROM information_schema.table_privileges WHERE table_name = 'User' AND grantee = 'app';"
```

Yoki login qilib sinab ko'ring!

