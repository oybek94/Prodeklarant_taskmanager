import { PrismaClient } from '@prisma/client';

/**
 * Database'dagi eski rollarni yangilash
 * Bu funksiya server ishga tushganda avtomatik chaqiriladi
 * Prisma client'dan foydalanmasdan, to'g'ridan-to'g'ri SQL orqali
 */
export async function fixDatabaseRoles() {
  // Prisma client'dan foydalanmasdan, to'g'ridan-to'g'ri database'ga ulanish
  const { PrismaClient } = require('@prisma/client');
  const tempPrisma = new PrismaClient();
  
  try {
    console.log('Database rollarini tekshiryapman...');
    
    // Avval foydalanuvchilarni yangilash (to'g'ridan-to'g'ri SQL)
    const updateResult = await tempPrisma.$executeRawUnsafe(`
      UPDATE "User" 
      SET role = 'DEKLARANT'::text
      WHERE role::text IN ('MANAGER', 'WORKER', 'ACCOUNTANT')
    `);
    
    if (updateResult > 0) {
      console.log(`${updateResult} ta foydalanuvchi rollari yangilandi.`);
    }
    
    // Enum'ni yangilash
    await tempPrisma.$executeRawUnsafe(`
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
    `);
    
    console.log('Database rollari yangilandi. Prisma client ni regenerate qiling.');
    console.log('Keyingi qadam: npx prisma generate');
    
    await tempPrisma.$disconnect();
  } catch (error: any) {
    console.error('Database rollarini yangilashda xatolik:', error.message);
    console.error('\n=== MANUAL YECHIM ===');
    console.error('Iltimos, quyidagi SQL\'ni pgAdmin orqali bajarishingiz kerak:');
    console.error('\nUPDATE "User" SET role = \'DEKLARANT\' WHERE role::text IN (\'MANAGER\', \'WORKER\', \'ACCOUNTANT\');');
    console.error('\nDO $$');
    console.error('BEGIN');
    console.error('    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = \'Role_new\') THEN DROP TYPE "Role_new"; END IF;');
    console.error('    CREATE TYPE "Role_new" AS ENUM (\'ADMIN\', \'DEKLARANT\');');
    console.error('    ALTER TABLE "User" ALTER COLUMN role TYPE "Role_new" USING role::text::"Role_new";');
    console.error('    DROP TYPE IF EXISTS "Role";');
    console.error('    ALTER TYPE "Role_new" RENAME TO "Role";');
    console.error('END $$;');
    console.error('\nKeyin: npx prisma generate');
    await tempPrisma.$disconnect();
  }
}

