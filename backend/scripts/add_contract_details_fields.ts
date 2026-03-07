import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Contract" 
      ADD COLUMN IF NOT EXISTS "sellerDetails" TEXT,
      ADD COLUMN IF NOT EXISTS "buyerDetails" TEXT,
      ADD COLUMN IF NOT EXISTS "shipperDetails" TEXT,
      ADD COLUMN IF NOT EXISTS "consigneeDetails" TEXT;
    `);
    console.log('Migration applied successfully');
  } catch (error) {
    console.error('Error applying migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();





