-- TIR/SMR/CMR hujjatlaridagi "viloyat" matn maydoni endi filialga (Sozlamalar >
-- Tuzilma) biriktiriladi, tir-excel.ts/cmr-excel.ts/cmr-doc.ts dagi qattiq
-- kodlangan filial->viloyat xaritasi o'rniga shu maydondan o'qiladi.
ALTER TABLE "Branch"
ADD COLUMN IF NOT EXISTS "regionText" TEXT;

-- Mavjud filiallar uchun avvalgi qattiq kodlangan qiymatlarni saqlab qolish
-- (xatti-harakat o'zgarmasligi uchun).
UPDATE "Branch"
SET "regionText" = 'Ферганская область'
WHERE "regionText" IS NULL AND (name ILIKE '%oltiariq%' OR name ILIKE '%oltariq%');

UPDATE "Branch"
SET "regionText" = 'Ташкентская область'
WHERE "regionText" IS NULL AND name ILIKE '%toshkent%';

UPDATE "Branch"
SET "regionText" = 'Сурхандарьинская область'
WHERE "regionText" IS NULL AND name ILIKE '%surxondaryo%';

UPDATE "Branch"
SET "regionText" = 'Сырдарьинская область'
WHERE "regionText" IS NULL AND name ILIKE '%sirdaryo%';
