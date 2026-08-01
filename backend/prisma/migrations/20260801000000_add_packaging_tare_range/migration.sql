-- Qadoq turiga bir qadoq tarasi (kg) oralig'ini qo'shamiz.
-- Maqsad: qadoq turi adashib noto'g'ri tanlanganini (brutto-netto)/qadoq soni orqali aniqlash.
-- NULL = bu tur uchun tekshiruv yo'q.

-- AlterTable
ALTER TABLE "PackagingType" ADD COLUMN "tareMin" DECIMAL(10,3);
ALTER TABLE "PackagingType" ADD COLUMN "tareMax" DECIMAL(10,3);

-- Mavjud standart turlar uchun boshlang'ich diapazonlar.
-- Keyinchalik Sozlamalar > Spetsifikatsiyalar > Qadoq turlari dan tahrirlanadi (deploy kerak emas).
-- Nomni normallashtirib solishtiramiz (bo'sh joylar/registr farq qilishi mumkin).
UPDATE "PackagingType" SET "tareMin" = 0.8,  "tareMax" = 2.0
  WHERE REPLACE(LOWER(TRIM("name")), ' ', '') = 'дер.ящик';

UPDATE "PackagingType" SET "tareMin" = 0.3,  "tareMax" = 0.7
  WHERE REPLACE(LOWER(TRIM("name")), ' ', '') IN ('пласт.ящик', 'пласт.ящик.');

UPDATE "PackagingType" SET "tareMin" = 0.01, "tareMax" = 0.1
  WHERE REPLACE(LOWER(TRIM("name")), ' ', '') = 'мешки';

UPDATE "PackagingType" SET "tareMin" = 0.3,  "tareMax" = 2.5
  WHERE REPLACE(LOWER(TRIM("name")), ' ', '') IN ('картон.короб.', 'картон.короб');

-- Навалом: qadoq yo'q, tara aniq nol bo'lishi kerak
UPDATE "PackagingType" SET "tareMin" = 0,    "tareMax" = 0
  WHERE REPLACE(LOWER(TRIM("name")), ' ', '') = 'навалом';
