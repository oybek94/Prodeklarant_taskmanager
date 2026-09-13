-- To'xtatilgan filial yangi invoys/vazifa yaratishda tanlov ro'yxatida
-- chiqmasligi uchun. Mavjud filiallar default true (o'zgarishsiz faol qoladi).
ALTER TABLE "Branch"
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
