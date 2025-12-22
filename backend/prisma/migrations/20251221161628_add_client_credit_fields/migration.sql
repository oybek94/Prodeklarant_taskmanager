-- Add credit fields to Client table
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "creditType" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "creditLimit" DECIMAL(12, 2);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "creditStartDate" TIMESTAMP;
