-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "packagesCount" DECIMAL(12,2);
