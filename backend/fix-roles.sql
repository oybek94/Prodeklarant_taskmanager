-- Avval enum'ni yangilash (foydalanuvchilarni yangilashdan oldin)
DO $$ 
BEGIN
    -- Agar Role_new enum mavjud bo'lsa, uni o'chirish
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role_new') THEN
        DROP TYPE "Role_new";
    END IF;
    
    -- Yangi enum yaratish (DEKLARANT bilan)
    CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DEKLARANT');
    
    -- User jadvalidagi role ustunini yangi enum'ga o'zgartirish
    -- Bu jarayonda eski rollarni avtomatik DEKLARANT ga o'zgartiradi
    ALTER TABLE "User" ALTER COLUMN role TYPE "Role_new" USING 
        CASE 
            WHEN role::text IN ('MANAGER', 'WORKER', 'ACCOUNTANT') THEN 'DEKLARANT'::"Role_new"
            WHEN role::text = 'ADMIN' THEN 'ADMIN'::"Role_new"
            ELSE 'DEKLARANT'::"Role_new"
        END;
    
    -- Eski enum'ni o'chirish
    DROP TYPE IF EXISTS "Role";
    
    -- Yangi enum'ni asl nomiga qaytarish
    ALTER TYPE "Role_new" RENAME TO "Role";
END $$;

