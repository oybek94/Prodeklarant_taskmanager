import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Applying invoice migration...');
    
    // Client jadvaliga yangi maydonlar qo'shish
    await prisma.$executeRaw`
      ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "contractNumber" TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "address" TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "inn" TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "email" TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bankAddress" TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "transitAccount" TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bankSwift" TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "correspondentBank" TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "correspondentBankAccount" TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "correspondentBankSwift" TEXT;
    `;
    
    console.log('✅ Client table migration applied successfully');
    
    // CompanySettings jadvalini yaratish
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "CompanySettings" (
        "id" SERIAL NOT NULL,
        "name" TEXT NOT NULL,
        "legalAddress" TEXT NOT NULL,
        "actualAddress" TEXT NOT NULL,
        "inn" TEXT,
        "phone" TEXT,
        "email" TEXT,
        "bankName" TEXT,
        "bankAddress" TEXT,
        "bankAccount" TEXT,
        "swiftCode" TEXT,
        "correspondentBank" TEXT,
        "correspondentBankAddress" TEXT,
        "correspondentBankSwift" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "CompanySettings_id_key" ON "CompanySettings"("id");
    `;
    
    console.log('✅ CompanySettings table created successfully');
    
    // Invoice jadvalini yaratish
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id" SERIAL NOT NULL,
        "invoiceNumber" TEXT NOT NULL,
        "contractNumber" TEXT,
        "taskId" INTEGER NOT NULL,
        "clientId" INTEGER NOT NULL,
        "branchId" INTEGER NOT NULL,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "currency" "Currency" NOT NULL DEFAULT 'USD',
        "totalAmount" DECIMAL(12,2) NOT NULL,
        "notes" TEXT,
        "additionalInfo" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
    `;
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_taskId_key" ON "Invoice"("taskId");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Invoice_clientId_idx" ON "Invoice"("clientId");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Invoice_taskId_idx" ON "Invoice"("taskId");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");
    `;
    
    // Foreign key constraints - check if they exist first
    try {
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_taskId_fkey'
          ) THEN
            ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_taskId_fkey" 
            FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `;
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.log('Note: Invoice_taskId_fkey constraint may already exist');
      }
    }
    
    try {
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_clientId_fkey'
          ) THEN
            ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" 
            FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
        END $$;
      `;
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.log('Note: Invoice_clientId_fkey constraint may already exist');
      }
    }
    
    try {
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_branchId_fkey'
          ) THEN
            ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_branchId_fkey" 
            FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
        END $$;
      `;
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.log('Note: Invoice_branchId_fkey constraint may already exist');
      }
    }
    
    console.log('✅ Invoice table created successfully');
    
    // InvoiceItem jadvalini yaratish
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "InvoiceItem" (
        "id" SERIAL NOT NULL,
        "invoiceId" INTEGER NOT NULL,
        "tnvedCode" TEXT,
        "pluCode" TEXT,
        "name" TEXT NOT NULL,
        "packageType" TEXT,
        "unit" TEXT NOT NULL,
        "quantity" DECIMAL(12,2) NOT NULL,
        "grossWeight" DECIMAL(12,2),
        "netWeight" DECIMAL(12,2),
        "unitPrice" DECIMAL(12,2) NOT NULL,
        "totalPrice" DECIMAL(12,2) NOT NULL,
        "orderIndex" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_orderIndex_idx" ON "InvoiceItem"("invoiceId", "orderIndex");
    `;
    
    try {
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceItem_invoiceId_fkey'
          ) THEN
            ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" 
            FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `;
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.log('Note: InvoiceItem_invoiceId_fkey constraint may already exist');
      }
    }
    
    console.log('✅ InvoiceItem table created successfully');
    
    console.log('✅ All migrations applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();

