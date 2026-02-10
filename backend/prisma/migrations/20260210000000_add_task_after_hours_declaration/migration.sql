-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AfterHoursPayer') THEN
        CREATE TYPE "AfterHoursPayer" AS ENUM ('CLIENT', 'COMPANY');
    END IF;
END $$;

-- AlterTable
ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS "afterHoursDeclaration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "afterHoursPayer" "AfterHoursPayer" NOT NULL DEFAULT 'CLIENT';
