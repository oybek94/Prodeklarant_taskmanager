-- CreateTable
CREATE TABLE "PackagingType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackagingType_pkey" PRIMARY KEY ("id")
);

-- Seed default qadoq turlari (Sozlamalar bo'limi uchun)
INSERT INTO "PackagingType" ("name", "code", "orderIndex", "createdAt", "updatedAt") VALUES
  ('дер.ящик', '4A', 1, NOW(), NOW()),
  ('пласт.ящик', '4H2', 2, NOW(), NOW()),
  ('мешки', '21', 3, NOW(), NOW()),
  ('картон.короб.', '4C1', 4, NOW(), NOW()),
  ('навалом', '13', 5, NOW(), NOW());
