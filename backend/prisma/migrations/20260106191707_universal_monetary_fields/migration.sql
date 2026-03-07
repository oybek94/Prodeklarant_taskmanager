-- Universal Monetary Fields Migration
-- This migration:
-- 1. Creates ExchangeSource enum
-- 2. Renames CurrencyExchangeRate to ExchangeRate and updates structure
-- 3. Adds universal monetary fields to all financial tables
-- 4. Migrates existing data to new fields
-- 5. Sets up indexes

-- Step 1: Create ExchangeSource enum
CREATE TYPE "ExchangeSource" AS ENUM ('CBU', 'MANUAL');

-- Step 2: Rename CurrencyExchangeRate to ExchangeRate and update structure
-- First, create new ExchangeRate table
CREATE TABLE "ExchangeRate" (
    "id" SERIAL NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "rate" DECIMAL(10,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "ExchangeSource" NOT NULL DEFAULT 'CBU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- Migrate data from CurrencyExchangeRate to ExchangeRate (only USD to UZS rates)
INSERT INTO "ExchangeRate" ("currency", "rate", "date", "source", "createdAt")
SELECT 
    'USD' as "currency",
    "rate",
    "date",
    CASE 
        WHEN "source" = 'CBU' OR "source" = 'API' THEN 'CBU'::"ExchangeSource"
        ELSE 'MANUAL'::"ExchangeSource"
    END as "source",
    "createdAt"
FROM "CurrencyExchangeRate"
WHERE "fromCurrency" = 'USD' AND "toCurrency" = 'UZS';

-- Create indexes on ExchangeRate
CREATE UNIQUE INDEX "ExchangeRate_currency_date_key" ON "ExchangeRate"("currency", "date");
CREATE INDEX "ExchangeRate_currency_idx" ON "ExchangeRate"("currency");
CREATE INDEX "ExchangeRate_date_idx" ON "ExchangeRate"("date");

-- Step 3: Add universal monetary fields to all financial tables

-- Client table
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "dealAmount_amount_original" DECIMAL(14,2);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "dealAmount_currency" "Currency";
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "dealAmount_exchange_rate" DECIMAL(10,4);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "dealAmount_amount_uzs" DECIMAL(16,2);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "dealAmount_exchange_source" "ExchangeSource";

-- Transaction table
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "amount_original" DECIMAL(14,2);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "currency_universal" "Currency";
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10,4);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "amount_uzs" DECIMAL(16,2);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "exchange_source" "ExchangeSource";

-- KpiLog table
ALTER TABLE "KpiLog" ADD COLUMN IF NOT EXISTS "amount_original" DECIMAL(14,2);
ALTER TABLE "KpiLog" ADD COLUMN IF NOT EXISTS "currency_universal" "Currency";
ALTER TABLE "KpiLog" ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10,4);
ALTER TABLE "KpiLog" ADD COLUMN IF NOT EXISTS "amount_uzs" DECIMAL(16,2);
ALTER TABLE "KpiLog" ADD COLUMN IF NOT EXISTS "exchange_source" "ExchangeSource";

-- TaskError table
ALTER TABLE "TaskError" ADD COLUMN IF NOT EXISTS "amount_original" DECIMAL(14,2);
ALTER TABLE "TaskError" ADD COLUMN IF NOT EXISTS "currency_universal" "Currency";
ALTER TABLE "TaskError" ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10,4);
ALTER TABLE "TaskError" ADD COLUMN IF NOT EXISTS "amount_uzs" DECIMAL(16,2);
ALTER TABLE "TaskError" ADD COLUMN IF NOT EXISTS "exchange_source" "ExchangeSource";

-- Debt table
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "amount_original" DECIMAL(14,2);
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "currency_universal" "Currency";
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10,4);
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "amount_uzs" DECIMAL(16,2);
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "exchange_source" "ExchangeSource";

-- PreviousYearWorkerDebt table
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "totalEarned_amount_original" DECIMAL(14,2);
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "totalPaid_amount_original" DECIMAL(14,2);
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "balance_amount_original" DECIMAL(14,2);
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "currency_universal" "Currency";
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10,4);
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "totalEarned_amount_uzs" DECIMAL(16,2);
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "totalPaid_amount_uzs" DECIMAL(16,2);
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "balance_amount_uzs" DECIMAL(16,2);
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "exchange_source" "ExchangeSource";

-- Invoice table
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "amount_original" DECIMAL(14,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "currency_universal" "Currency";
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10,4);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "amount_uzs" DECIMAL(16,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "exchange_source" "ExchangeSource";

-- Task table - snapshot fields
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotDealAmount_amount_original" DECIMAL(14,2);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotDealAmount_currency" "Currency";
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotDealAmount_exchange_rate" DECIMAL(10,4);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotDealAmount_amount_uzs" DECIMAL(16,2);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotDealAmount_exchange_source" "ExchangeSource";

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotCertificatePayment_amount_original" DECIMAL(14,2);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotCertificatePayment_currency" "Currency";
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotCertificatePayment_exchange_rate" DECIMAL(10,4);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotCertificatePayment_amount_uzs" DECIMAL(16,2);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotCertificatePayment_exchange_source" "ExchangeSource";

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotPsrPrice_amount_original" DECIMAL(14,2);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotPsrPrice_currency" "Currency";
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotPsrPrice_exchange_rate" DECIMAL(10,4);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotPsrPrice_amount_uzs" DECIMAL(16,2);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotPsrPrice_exchange_source" "ExchangeSource";

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotWorkerPrice_amount_original" DECIMAL(14,2);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotWorkerPrice_currency" "Currency";
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotWorkerPrice_exchange_rate" DECIMAL(10,4);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotWorkerPrice_amount_uzs" DECIMAL(16,2);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotWorkerPrice_exchange_source" "ExchangeSource";

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotCustomsPayment_amount_original" DECIMAL(14,2);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotCustomsPayment_currency" "Currency";
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotCustomsPayment_exchange_rate" DECIMAL(10,4);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotCustomsPayment_amount_uzs" DECIMAL(16,2);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotCustomsPayment_exchange_source" "ExchangeSource";

-- Step 4: Migrate existing data
-- Note: Data migration will be handled by TypeScript script to use exchange rate service
-- This SQL migration just adds the columns as nullable

-- Step 5: Add indexes on new fields (optional, for performance)
-- Indexes will be created by Prisma based on schema indexes

-- Note: CurrencyExchangeRate table will be dropped in a later migration
-- after data migration script confirms all data is migrated

