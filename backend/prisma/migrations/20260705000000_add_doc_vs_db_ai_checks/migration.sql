-- Yangi AiCheckType qiymatlari (hujjat ↔ bazadagi invoys tekshiruvi uchun)
ALTER TYPE "AiCheckType" ADD VALUE IF NOT EXISTS 'ST_VS_DB';
ALTER TYPE "AiCheckType" ADD VALUE IF NOT EXISTS 'CMR_VS_DB';
ALTER TYPE "AiCheckType" ADD VALUE IF NOT EXISTS 'TIR_VS_DB';
ALTER TYPE "AiCheckType" ADD VALUE IF NOT EXISTS 'FITO_VS_DB';

-- AiCheck endi muayyan hujjatga bog'lanishi mumkin
ALTER TABLE "AiCheck" ADD COLUMN IF NOT EXISTS "taskDocumentId" INTEGER;

DO $$
BEGIN
  ALTER TABLE "AiCheck"
    ADD CONSTRAINT "AiCheck_taskDocumentId_fkey"
    FOREIGN KEY ("taskDocumentId") REFERENCES "TaskDocument"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "AiCheck_taskDocumentId_idx" ON "AiCheck"("taskDocumentId");
