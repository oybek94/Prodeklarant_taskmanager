-- AlterTable
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "sellerDetails" TEXT,
ADD COLUMN IF NOT EXISTS "buyerDetails" TEXT,
ADD COLUMN IF NOT EXISTS "shipperDetails" TEXT,
ADD COLUMN IF NOT EXISTS "consigneeDetails" TEXT;





