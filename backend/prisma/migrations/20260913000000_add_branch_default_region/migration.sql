-- Har bir filial (Branch) o'ziga tegishli bitta tumanga (RegionCode) bog'lanishi
-- mumkin: shu tuman belgilangan bo'lsa, invoysda "Sertifikatlar"/"Deklaratsiya"
-- tugmalari tuman qo'lda tanlanmasdan darhol chiqadi (ilgari faqat "Oltiariq"
-- filiali uchun qattiq kodlangan edi).
ALTER TABLE "Branch"
ADD COLUMN IF NOT EXISTS "defaultRegionCodeId" INTEGER;

CREATE INDEX IF NOT EXISTS "Branch_defaultRegionCodeId_idx" ON "Branch"("defaultRegionCodeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Branch_defaultRegionCodeId_fkey'
  ) THEN
    ALTER TABLE "Branch"
      ADD CONSTRAINT "Branch_defaultRegionCodeId_fkey"
      FOREIGN KEY ("defaultRegionCodeId") REFERENCES "RegionCode"(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Mavjud "Oltiariq" filialini ilgarigi qattiq kodlangan mantiqqa mos hudud
-- kodiga bog'lash (bo'lsa) — xatti-harakat o'zgarmasligi uchun.
UPDATE "Branch" b
SET "defaultRegionCodeId" = rc.id
FROM "RegionCode" rc
WHERE b."defaultRegionCodeId" IS NULL
  AND b.name ILIKE '%oltiariq%'
  AND (rc.name ILIKE '%oltiariq%' OR rc.name ILIKE '%олтиарик%');

-- Yangi "Namangan" filialini "Туракургон тумани" hudud kodiga bog'lash (bo'lsa).
UPDATE "Branch" b
SET "defaultRegionCodeId" = rc.id
FROM "RegionCode" rc
WHERE b."defaultRegionCodeId" IS NULL
  AND b.name ILIKE '%namangan%'
  AND rc.name ILIKE '%туракургон%';
