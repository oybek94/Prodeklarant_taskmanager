-- Xodim tokenlarini bekor qilish: parol/rol/filial o'zgarganda yoki xodim bloklanganda
-- User.tokenVersion oshiriladi va eski access/refresh tokenlar yaroqsiz bo'ladi.
-- NOT NULL DEFAULT 0 — mavjud qatorlar 0 oladi, eski tokenlar (tv yo'q = 0) ishlashda davom etadi.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
