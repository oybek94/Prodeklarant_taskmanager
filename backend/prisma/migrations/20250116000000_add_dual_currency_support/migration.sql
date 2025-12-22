-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'UZS');

-- CreateTable
CREATE TABLE IF NOT EXISTS "CurrencyExchangeRate" (
    "id" SERIAL NOT NULL,
    "fromCurrency" "Currency" NOT NULL,
    "toCurrency" "Currency" NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'API',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyExchangeRate_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add dealAmountCurrency to Client
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "dealAmountCurrency" "Currency" DEFAULT 'USD';

-- AlterTable: Add currency to StatePayment
ALTER TABLE "StatePayment" ADD COLUMN IF NOT EXISTS "currency" "Currency" DEFAULT 'UZS';

-- AlterTable: Change Transaction.currency from TEXT to Currency enum
-- First, update existing records to ensure they have valid currency values
UPDATE "Transaction" SET "currency" = 'USD' WHERE "currency" IS NULL OR "currency" NOT IN ('USD', 'UZS');
-- Drop default, change type, then restore default
ALTER TABLE "Transaction" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "currency" TYPE "Currency" USING "currency"::"Currency";
ALTER TABLE "Transaction" ALTER COLUMN "currency" SET DEFAULT 'USD'::"Currency";

-- AlterTable: Change Debt.currency from TEXT to Currency enum
-- First, update existing records
UPDATE "Debt" SET "currency" = 'USD' WHERE "currency" IS NULL OR "currency" NOT IN ('USD', 'UZS');
-- Drop default, change type, then restore default
ALTER TABLE "Debt" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "Debt" ALTER COLUMN "currency" TYPE "Currency" USING "currency"::"Currency";
ALTER TABLE "Debt" ALTER COLUMN "currency" SET DEFAULT 'USD'::"Currency";

-- AlterTable: Change AccountBalance.currency from TEXT to Currency enum
-- First, update existing records
UPDATE "AccountBalance" SET "currency" = 'USD' WHERE "currency" IS NULL OR "currency" NOT IN ('USD', 'UZS');
-- Drop default, change type, then restore default
ALTER TABLE "AccountBalance" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "AccountBalance" ALTER COLUMN "currency" TYPE "Currency" USING "currency"::"Currency";
ALTER TABLE "AccountBalance" ALTER COLUMN "currency" SET DEFAULT 'USD'::"Currency";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CurrencyExchangeRate_fromCurrency_toCurrency_date_key" ON "CurrencyExchangeRate"("fromCurrency", "toCurrency", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurrencyExchangeRate_fromCurrency_toCurrency_idx" ON "CurrencyExchangeRate"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurrencyExchangeRate_date_idx" ON "CurrencyExchangeRate"("date");

-- Insert default UZS balances if they don't exist
-- CARD faqat UZS bo'lishi mumkin, shuning uchun CARD-USD yaratilmaydi
INSERT INTO "AccountBalance" ("type", "balance", "currency", "createdAt", "updatedAt")
VALUES 
    ('CASH', 0, 'UZS', NOW(), NOW()),
    ('CARD', 0, 'UZS', NOW(), NOW())
ON CONFLICT ("type", "currency") DO NOTHING;

-- CARD-USD balanslarini o'chirish (agar mavjud bo'lsa)
DELETE FROM "AccountBalance" WHERE "type" = 'CARD' AND "currency" = 'USD';

