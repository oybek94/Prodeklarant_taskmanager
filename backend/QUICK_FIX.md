# Tezkor Yechim - Database Rollarini Yangilash

## Muammo
500 xatolik: Database'da hali ham eski rollar (WORKER, MANAGER, ACCOUNTANT) bor.

## Tezkor Yechim (3 qadam)

### 1. Backend server'ni TO'XTATING
Terminal'da `Ctrl+C` bosing

### 2. pgAdmin'da SQL bajarish

1. **pgAdmin** oching
2. **prodeklarant** database'ni tanlang
3. **Tools → Query Tool**
4. Quyidagi SQL'ni kiriting va **Execute** (F5):

```sql
UPDATE "User" SET role = 'DEKLARANT' WHERE role::text IN ('MANAGER', 'WORKER', 'ACCOUNTANT');

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role_new') THEN
        DROP TYPE "Role_new";
    END IF;
    CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DEKLARANT');
    ALTER TABLE "User" ALTER COLUMN role TYPE "Role_new" USING role::text::"Role_new";
    DROP TYPE IF EXISTS "Role";
    ALTER TYPE "Role_new" RENAME TO "Role";
END $$;
```

### 3. Prisma client regenerate

```bash
cd backend
npx prisma generate
```

### 4. Server'ni qayta ishga tushiring

```bash
npm run dev
```

## Tekshirish

pgAdmin'da quyidagi SQL'ni bajarib tekshiring:

```sql
SELECT DISTINCT role FROM "User";
```

Natija: faqat `ADMIN` va `DEKLARANT` ko'rsatilishi kerak.

