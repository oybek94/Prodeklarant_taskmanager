-- Add QR token to tasks for verification links
ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS "qrToken" TEXT;

-- Add unique constraint for QR token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'Task_qrToken_key'
  ) THEN
    CREATE UNIQUE INDEX "Task_qrToken_key" ON "Task"("qrToken");
  END IF;
END $$;
