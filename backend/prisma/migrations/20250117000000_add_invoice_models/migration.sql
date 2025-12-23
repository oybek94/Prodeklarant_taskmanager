-- AlterTable: Add shartnoma ma'lumotlari to Client
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "contractNumber" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "inn" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bankAddress" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "transitAccount" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bankSwift" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "correspondentBank" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "correspondentBankAccount" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "correspondentBankSwift" TEXT;

-- CreateTable: CompanySettings
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

-- CreateTable: Invoice
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

-- CreateTable: InvoiceItem
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CompanySettings_id_key" ON "CompanySettings"("id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_taskId_key" ON "Invoice"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_taskId_idx" ON "Invoice"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_orderIndex_idx" ON "InvoiceItem"("invoiceId", "orderIndex");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

