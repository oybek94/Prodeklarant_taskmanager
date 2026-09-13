-- Har bir mijoz bitta xodimga (mas'ul foydalanuvchi) "shaxsiy mijoz" sifatida
-- biriktirilishi mumkin. Bo'sh (NULL) qolsa, frontend uni "Admin" deb ko'rsatadi.
ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "assignedUserId" INTEGER;

CREATE INDEX IF NOT EXISTS "Client_assignedUserId_idx" ON "Client"("assignedUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Client_assignedUserId_fkey'
  ) THEN
    ALTER TABLE "Client"
      ADD CONSTRAINT "Client_assignedUserId_fkey"
      FOREIGN KEY ("assignedUserId") REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
