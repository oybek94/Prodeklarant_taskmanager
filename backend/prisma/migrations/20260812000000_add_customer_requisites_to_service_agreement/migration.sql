-- Erkin, ko'p qatorli buyurtmachi rekvizitlari (PDF 13-bo'limi uchun)
ALTER TABLE "ServiceAgreement" ADD COLUMN IF NOT EXISTS "customerRequisites" TEXT;
