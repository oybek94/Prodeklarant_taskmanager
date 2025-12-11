-- First, update existing users with MANAGER, WORKER, or ACCOUNTANT roles to DEKLARANT
UPDATE "User" 
SET role = 'DEKLARANT' 
WHERE role IN ('MANAGER', 'WORKER', 'ACCOUNTANT');

-- Alter the Role enum to remove old values and add DEKLARANT
-- Note: PostgreSQL doesn't support removing enum values directly, so we need to:
-- 1. Create a new enum with the desired values
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DEKLARANT');

-- 2. Update the User table to use the new enum
ALTER TABLE "User" ALTER COLUMN role TYPE "Role_new" USING role::text::"Role_new";

-- 3. Drop the old enum
DROP TYPE "Role";

-- 4. Rename the new enum to the original name
ALTER TYPE "Role_new" RENAME TO "Role";
