-- Add dual currency amounts for BXM
ALTER TABLE "BXMConfig"
ADD COLUMN IF NOT EXISTS "amountUsd" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "amountUzs" DECIMAL(16,2);

-- Backfill from existing amount where possible
UPDATE "BXMConfig"
SET
  "amountUsd" = COALESCE("amountUsd", "amount"),
  "amountUzs" = COALESCE("amountUzs", 412000)
WHERE "amountUsd" IS NULL OR "amountUzs" IS NULL;
