-- Fumigatsiya eslatmalari: remindAt kelganda Telegram notify bot guruhga xabar beradi
CREATE TABLE IF NOT EXISTS "FumigationReminder" (
    "id" SERIAL NOT NULL,
    "truckNumber" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FumigationReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FumigationReminder_sentAt_remindAt_idx" ON "FumigationReminder"("sentAt", "remindAt");
CREATE INDEX IF NOT EXISTS "FumigationReminder_createdById_idx" ON "FumigationReminder"("createdById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FumigationReminder_createdById_fkey'
  ) THEN
    ALTER TABLE "FumigationReminder"
      ADD CONSTRAINT "FumigationReminder_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
