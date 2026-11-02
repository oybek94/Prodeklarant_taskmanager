-- Yuk ma'lumotlari botida shartnoma bo'yicha qo'lda yozilgan "Место назначения" qiymatlari
CREATE TABLE IF NOT EXISTS "ClientBotDestination" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientBotDestination_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClientBotDestination_contractId_idx" ON "ClientBotDestination"("contractId");

CREATE UNIQUE INDEX IF NOT EXISTS "ClientBotDestination_contractId_name_key" ON "ClientBotDestination"("contractId", "name");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientBotDestination_contractId_fkey') THEN
    ALTER TABLE "ClientBotDestination" ADD CONSTRAINT "ClientBotDestination_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
