-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultCurrency" "Currency";

-- AlterTable
ALTER TABLE "StatePayment" ADD COLUMN IF NOT EXISTS "certificatePayment_amount_original" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "certificatePayment_amount_uzs" DECIMAL(16,2),
ADD COLUMN IF NOT EXISTS "psrPrice_amount_original" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "psrPrice_amount_uzs" DECIMAL(16,2),
ADD COLUMN IF NOT EXISTS "workerPrice_amount_original" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "workerPrice_amount_uzs" DECIMAL(16,2),
ADD COLUMN IF NOT EXISTS "customsPayment_amount_original" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "customsPayment_amount_uzs" DECIMAL(16,2),
ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS "exchange_source" "ExchangeSource" DEFAULT 'CBU';

-- Backfill StatePayment: Set exchange_rate=1, amount_uzs=amount_original for all existing records
UPDATE "StatePayment"
SET
  "certificatePayment_amount_original" = "certificatePayment",
  "certificatePayment_amount_uzs" = "certificatePayment",
  "psrPrice_amount_original" = "psrPrice",
  "psrPrice_amount_uzs" = "psrPrice",
  "workerPrice_amount_original" = "workerPrice",
  "workerPrice_amount_uzs" = "workerPrice",
  "customsPayment_amount_original" = "customsPayment",
  "customsPayment_amount_uzs" = "customsPayment",
  "exchange_rate" = 1,
  "exchange_source" = 'CBU'
WHERE "exchange_rate" IS NULL;

