-- AlterTable
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "botGroupChatId" TEXT,
ADD COLUMN IF NOT EXISTS "botLinkCode" TEXT,
ADD COLUMN IF NOT EXISTS "botLinkCodeExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "destinationPlaces" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientBotProduct" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientBotProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Client_botGroupChatId_key" ON "Client"("botGroupChatId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientBotProduct_clientId_idx" ON "ClientBotProduct"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClientBotProduct_clientId_name_key" ON "ClientBotProduct"("clientId", "name");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientBotProduct_clientId_fkey') THEN
    ALTER TABLE "ClientBotProduct" ADD CONSTRAINT "ClientBotProduct_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
