-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientCargoDraftStatus') THEN
    CREATE TYPE "ClientCargoDraftStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientCargoDraft" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "chatId" TEXT NOT NULL,
    "status" "ClientCargoDraftStatus" NOT NULL DEFAULT 'OPEN',
    "data" JSONB NOT NULL,
    "authors" JSONB NOT NULL,
    "messageId" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedByName" TEXT,

    CONSTRAINT "ClientCargoDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientCargoDraft_clientId_status_updatedAt_idx" ON "ClientCargoDraft"("clientId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientCargoDraft_chatId_status_idx" ON "ClientCargoDraft"("chatId", "status");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientCargoDraft_clientId_fkey') THEN
    ALTER TABLE "ClientCargoDraft" ADD CONSTRAINT "ClientCargoDraft_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
