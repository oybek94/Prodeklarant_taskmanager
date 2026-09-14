-- Mijozga biriktirilgan xodim uchun foyda-bonus sxemasi.
-- Filial darajasidagi "Xizmat haqi" soliq stavkasi (default 9.5%).
ALTER TABLE "CertifierFeeConfig"
ADD COLUMN IF NOT EXISTS "serviceFeeTaxRatePercent" DECIMAL(5, 2) NOT NULL DEFAULT 9.5;

-- Har bir yakunlangan task uchun hisoblangan mijoz-bonus yozuvi
-- (task yakunlanganda yaratiladi, qayta ochilsa o'chiriladi).
CREATE TABLE IF NOT EXISTS "ClientAssignmentBonus" (
  "id" SERIAL PRIMARY KEY,
  "taskId" INTEGER NOT NULL,
  "clientId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "dealAmountUzs" DECIMAL(18, 2) NOT NULL,
  "taxUzs" DECIMAL(18, 2) NOT NULL,
  "certifierFeeUzs" DECIMAL(18, 2) NOT NULL,
  "otherWorkersFeeUzs" DECIMAL(18, 2) NOT NULL,
  "profitUzs" DECIMAL(18, 2) NOT NULL,
  "bonusUzs" DECIMAL(18, 2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientAssignmentBonus_taskId_key" ON "ClientAssignmentBonus"("taskId");
CREATE INDEX IF NOT EXISTS "ClientAssignmentBonus_userId_idx" ON "ClientAssignmentBonus"("userId");
CREATE INDEX IF NOT EXISTS "ClientAssignmentBonus_clientId_idx" ON "ClientAssignmentBonus"("clientId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ClientAssignmentBonus_taskId_fkey'
  ) THEN
    ALTER TABLE "ClientAssignmentBonus"
      ADD CONSTRAINT "ClientAssignmentBonus_taskId_fkey"
      FOREIGN KEY ("taskId") REFERENCES "Task"(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ClientAssignmentBonus_clientId_fkey'
  ) THEN
    ALTER TABLE "ClientAssignmentBonus"
      ADD CONSTRAINT "ClientAssignmentBonus_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ClientAssignmentBonus_userId_fkey'
  ) THEN
    ALTER TABLE "ClientAssignmentBonus"
      ADD CONSTRAINT "ClientAssignmentBonus_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
