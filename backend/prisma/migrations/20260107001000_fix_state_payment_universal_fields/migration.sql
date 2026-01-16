-- Ensure StatePayment universal monetary fields exist (drift fix)
ALTER TABLE "StatePayment"
ADD COLUMN IF NOT EXISTS "certificatePayment_amount_original" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "certificatePayment_amount_uzs" DECIMAL(16,2),
ADD COLUMN IF NOT EXISTS "psrPrice_amount_original" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "psrPrice_amount_uzs" DECIMAL(16,2),
ADD COLUMN IF NOT EXISTS "workerPrice_amount_original" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "workerPrice_amount_uzs" DECIMAL(16,2),
ADD COLUMN IF NOT EXISTS "customsPayment_amount_original" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "customsPayment_amount_uzs" DECIMAL(16,2),
ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS "exchange_source" "ExchangeSource" DEFAULT 'CBU';

-- Backfill using legacy columns if new fields are empty
UPDATE "StatePayment"
SET
  "certificatePayment_amount_original" = COALESCE("certificatePayment_amount_original", "certificatePayment"),
  "certificatePayment_amount_uzs" = COALESCE("certificatePayment_amount_uzs", "certificatePayment"),
  "psrPrice_amount_original" = COALESCE("psrPrice_amount_original", "psrPrice"),
  "psrPrice_amount_uzs" = COALESCE("psrPrice_amount_uzs", "psrPrice"),
  "workerPrice_amount_original" = COALESCE("workerPrice_amount_original", "workerPrice"),
  "workerPrice_amount_uzs" = COALESCE("workerPrice_amount_uzs", "workerPrice"),
  "customsPayment_amount_original" = COALESCE("customsPayment_amount_original", "customsPayment"),
  "customsPayment_amount_uzs" = COALESCE("customsPayment_amount_uzs", "customsPayment"),
  "exchange_rate" = COALESCE("exchange_rate", 1),
  "exchange_source" = COALESCE("exchange_source", 'CBU')
WHERE
  "certificatePayment_amount_original" IS NULL
  OR "certificatePayment_amount_uzs" IS NULL
  OR "psrPrice_amount_original" IS NULL
  OR "psrPrice_amount_uzs" IS NULL
  OR "workerPrice_amount_original" IS NULL
  OR "workerPrice_amount_uzs" IS NULL
  OR "customsPayment_amount_original" IS NULL
  OR "customsPayment_amount_uzs" IS NULL
  OR "exchange_rate" IS NULL
  OR "exchange_source" IS NULL;
