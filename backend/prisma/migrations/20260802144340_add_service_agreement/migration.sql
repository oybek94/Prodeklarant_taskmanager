-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PaymentModel" AS ENUM ('PREPAID', 'MONTHLY', 'PER_COUNT', 'PER_AMOUNT');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "director" TEXT,
ADD COLUMN     "mfo" TEXT,
ADD COLUMN     "oked" TEXT;

-- CreateTable
CREATE TABLE "ServiceAgreement" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "agreementNumber" TEXT NOT NULL,
    "agreementDate" TIMESTAMP(3) NOT NULL,
    "templateVersion" TEXT NOT NULL DEFAULT 'v1',
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    "customerName" TEXT NOT NULL,
    "customerInn" TEXT,
    "customerAddress" TEXT,
    "customerDirector" TEXT,
    "customerDirectorBasis" TEXT,
    "customerBankName" TEXT,
    "customerBankAccount" TEXT,
    "customerMfo" TEXT,
    "customerOked" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "executorName" TEXT NOT NULL,
    "executorInn" TEXT,
    "executorAddress" TEXT,
    "executorDirector" TEXT,
    "executorBankName" TEXT,
    "executorBankAccount" TEXT,
    "executorMfo" TEXT,
    "executorOked" TEXT,
    "executorPhone" TEXT,
    "executorEmail" TEXT,
    "paymentModel" "PaymentModel" NOT NULL DEFAULT 'PREPAID',
    "monthlyDueDay" INTEGER,
    "perCountThreshold" INTEGER,
    "perCountDueDays" INTEGER,
    "perAmountThreshold" DECIMAL(18,2),
    "perAmountDueDays" INTEGER,
    "creditLimit" DECIMAL(18,2),
    "prepaidRevertDays" INTEGER NOT NULL DEFAULT 10,
    "mainTariffBhm" DECIMAL(6,2) NOT NULL,
    "tariffs" JSONB NOT NULL DEFAULT '[]',
    "vatPayer" BOOLEAN NOT NULL DEFAULT false,
    "jurisdictionCourt" TEXT,
    "brokerRegistryNumber" TEXT,
    "signingPlace" TEXT NOT NULL DEFAULT 'Олтиариқ тумани',
    "includeSeal" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAgreement_agreementNumber_key" ON "ServiceAgreement"("agreementNumber");

-- CreateIndex
CREATE INDEX "ServiceAgreement_clientId_idx" ON "ServiceAgreement"("clientId");

-- CreateIndex
CREATE INDEX "ServiceAgreement_customerInn_idx" ON "ServiceAgreement"("customerInn");

-- CreateIndex
CREATE INDEX "ServiceAgreement_status_idx" ON "ServiceAgreement"("status");

-- AddForeignKey
ALTER TABLE "ServiceAgreement" ADD CONSTRAINT "ServiceAgreement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

