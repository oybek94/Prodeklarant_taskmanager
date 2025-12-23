-- CreateTable
CREATE TABLE IF NOT EXISTS "Contract" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "contractDate" TIMESTAMP(3) NOT NULL,
    "sellerName" TEXT NOT NULL,
    "sellerLegalAddress" TEXT NOT NULL,
    "sellerInn" TEXT,
    "sellerOgrn" TEXT,
    "sellerBankName" TEXT,
    "sellerBankAddress" TEXT,
    "sellerBankAccount" TEXT,
    "sellerBankSwift" TEXT,
    "sellerCorrespondentBank" TEXT,
    "sellerCorrespondentBankAccount" TEXT,
    "sellerCorrespondentBankSwift" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerAddress" TEXT NOT NULL,
    "buyerInn" TEXT,
    "buyerOgrn" TEXT,
    "buyerBankName" TEXT,
    "buyerBankAddress" TEXT,
    "buyerBankAccount" TEXT,
    "buyerBankSwift" TEXT,
    "buyerCorrespondentBank" TEXT,
    "buyerCorrespondentBankAccount" TEXT,
    "buyerCorrespondentBankSwift" TEXT,
    "shipperName" TEXT,
    "shipperAddress" TEXT,
    "shipperInn" TEXT,
    "shipperOgrn" TEXT,
    "shipperBankName" TEXT,
    "shipperBankAddress" TEXT,
    "shipperBankAccount" TEXT,
    "shipperBankSwift" TEXT,
    "consigneeName" TEXT,
    "consigneeAddress" TEXT,
    "consigneeInn" TEXT,
    "consigneeOgrn" TEXT,
    "consigneeBankName" TEXT,
    "consigneeBankAddress" TEXT,
    "consigneeBankAccount" TEXT,
    "consigneeBankSwift" TEXT,
    "deliveryTerms" TEXT,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- Add contractId to Invoice
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "contractId" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Contract_clientId_idx" ON "Contract"("clientId");
CREATE INDEX IF NOT EXISTS "Contract_contractNumber_idx" ON "Contract"("contractNumber");
CREATE INDEX IF NOT EXISTS "Invoice_contractId_idx" ON "Invoice"("contractId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

