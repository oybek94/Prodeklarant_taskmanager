-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "SalarySource" AS ENUM ('SALARY', 'CLIENT_BONUS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "salarySource" "SalarySource";
