-- AlterTable
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "sellerSignatureUrl" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "sellerSealUrl" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "buyerSignatureUrl" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "buyerSealUrl" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "consigneeSignatureUrl" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "consigneeSealUrl" TEXT;
