-- Add exchange rate fields to all financial models
-- Step 1: Add nullable columns for exchange rate fields

-- Client model
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "dealAmountExchangeRate" DECIMAL(18,6);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "dealAmountInUzs" DECIMAL(12,2);

-- Task model - exchange rate snapshots
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotDealAmountExchangeRate" DECIMAL(18,6);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotCertificatePaymentExchangeRate" DECIMAL(18,6);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotPsrPriceExchangeRate" DECIMAL(18,6);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotWorkerPriceExchangeRate" DECIMAL(18,6);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "snapshotCustomsPaymentExchangeRate" DECIMAL(18,6);

-- Transaction model
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "originalAmount" DECIMAL(12,2);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "originalCurrency" "Currency";
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(18,6);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "convertedUzsAmount" DECIMAL(12,2);

-- KpiLog model
ALTER TABLE "KpiLog" ADD COLUMN IF NOT EXISTS "currency" "Currency" DEFAULT 'USD';
ALTER TABLE "KpiLog" ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(18,6);
ALTER TABLE "KpiLog" ADD COLUMN IF NOT EXISTS "convertedUzsAmount" DECIMAL(12,2);

-- TaskError model
ALTER TABLE "TaskError" ADD COLUMN IF NOT EXISTS "currency" "Currency" DEFAULT 'USD';
ALTER TABLE "TaskError" ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(18,6);
ALTER TABLE "TaskError" ADD COLUMN IF NOT EXISTS "convertedUzsAmount" DECIMAL(12,2);

-- Debt model
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "originalAmount" DECIMAL(12,2);
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "originalCurrency" "Currency";
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(18,6);
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "convertedUzsAmount" DECIMAL(12,2);

-- PreviousYearWorkerDebt model
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(18,6);
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "totalEarnedInUzs" DECIMAL(12,2);
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "totalPaidInUzs" DECIMAL(12,2);
ALTER TABLE "PreviousYearWorkerDebt" ADD COLUMN IF NOT EXISTS "balanceInUzs" DECIMAL(12,2);

-- Invoice model
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(18,6);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "convertedUzsAmount" DECIMAL(12,2);

-- Note: Backfill will be done by TypeScript script to use exchange rate service
-- After backfill, these columns should be made NOT NULL (except where currency is optional)

