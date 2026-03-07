-- Invoice raqami shartnoma bo'yicha unique bo'ladi (har bir shartnoma ichida takrorlanmasin)
-- Turli shartnomalarda bir xil raqam bo'lishi mumkin

-- Global unique indexni olib tashlash
DROP INDEX IF EXISTS "Invoice_invoiceNumber_key";

-- Shartnoma bilan: (contractId, invoiceNumber) unique
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_contractId_invoiceNumber_key" 
  ON "Invoice"("contractId", "invoiceNumber") 
  WHERE "contractId" IS NOT NULL;

-- Shartnomasiz: invoiceNumber global unique (contractId null bo'lganda)
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_null_contract_key" 
  ON "Invoice"("invoiceNumber") 
  WHERE "contractId" IS NULL;
