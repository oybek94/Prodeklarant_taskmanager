-- AlterEnum
-- Add CERTIFICATE_WORKER to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CERTIFICATE_WORKER';

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD');

-- CreateEnum
CREATE TYPE "DebtorType" AS ENUM ('CLIENT', 'WORKER', 'CERTIFICATE_WORKER', 'OTHER');

-- AlterTable
-- Add paymentMethod to Transaction
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";

-- CreateTable
CREATE TABLE IF NOT EXISTS "AccountBalance" (
    "id" SERIAL NOT NULL,
    "type" "PaymentMethod" NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Debt" (
    "id" SERIAL NOT NULL,
    "debtorType" "DebtorType" NOT NULL,
    "debtorId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "comment" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AccountBalance_type_currency_key" ON "AccountBalance"("type", "currency");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AccountBalance_type_idx" ON "AccountBalance"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Debt_debtorType_debtorId_idx" ON "Debt"("debtorType", "debtorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Debt_date_idx" ON "Debt"("date");

-- Insert default account balances
INSERT INTO "AccountBalance" ("type", "balance", "currency", "createdAt", "updatedAt")
VALUES 
    ('CASH', 0, 'USD', NOW(), NOW()),
    ('CARD', 0, 'USD', NOW(), NOW())
ON CONFLICT ("type", "currency") DO NOTHING;

