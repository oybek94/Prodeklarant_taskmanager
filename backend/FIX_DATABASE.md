# Database Rollarini Yangilash

## Muammo
Database'da hali ham eski rollar (WORKER, MANAGER, ACCOUNTANT) bor, lekin Prisma schema'da faqat ADMIN va DEKLARANT qoldirilgan.

## Yechim

### 1. pgAdmin orqali (Tavsiya etiladi)

1. pgAdmin'ni oching
2. `prodeklarant` database'ni tanlang
3. **Tools → Query Tool** ni oching
4. Quyidagi SQL'ni kiriting va **Execute** tugmasini bosing:

```sql
-- Avval barcha eski rollarni DEKLARANT ga o'zgartirish
UPDATE "User" 
SET role = 'DEKLARANT' 
WHERE role::text IN ('MANAGER', 'WORKER', 'ACCOUNTANT');

-- Enum'ni yangilash
DO $$ 
BEGIN
    -- Agar Role_new enum mavjud bo'lsa, uni o'chirish
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role_new') THEN
        DROP TYPE "Role_new";
    END IF;
    
    -- Yangi enum yaratish
    CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DEKLARANT');
    
    -- User jadvalidagi role ustunini yangilash
    ALTER TABLE "User" ALTER COLUMN role TYPE "Role_new" USING role::text::"Role_new";
    
    -- Eski enum'ni o'chirish
    DROP TYPE IF EXISTS "Role";
    
    -- Yangi enum'ni asl nomiga qaytarish
    ALTER TYPE "Role_new" RENAME TO "Role";
END $$;
```

### 2. PowerShell script orqali

```powershell
cd G:\Prodeklarant\backend
.\fix-database.ps1
```

**Eslatma:** PostgreSQL parolini script ichida o'zgartiring.

### 3. Prisma client'ni regenerate qiling

Backend server'ni **to'xtating** va quyidagilarni bajaring:

```bash
cd backend
npx prisma generate
```

### 4. Backend server'ni qayta ishga tushiring

```bash
npm run dev
```

## Tekshirish

SQL bajarilgandan keyin, quyidagi SQL orqali tekshiring:

```sql
SELECT DISTINCT role FROM "User";
```

Natija: faqat `ADMIN` va `DEKLARANT` ko'rsatilishi kerak.

