-- Add createdById to TaskError for permission checks
ALTER TABLE "TaskError"
ADD COLUMN IF NOT EXISTS "createdById" INTEGER;

-- Backfill existing rows to workerId (best available proxy)
UPDATE "TaskError"
SET "createdById" = COALESCE("createdById", "workerId")
WHERE "createdById" IS NULL;

-- Add foreign key constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'TaskError_createdById_fkey'
  ) THEN
    ALTER TABLE "TaskError"
      ADD CONSTRAINT "TaskError_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
