-- AlterTable
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "buyerDirector" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "consigneeDirector" TEXT;
