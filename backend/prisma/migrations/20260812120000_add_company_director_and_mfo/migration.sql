-- Shartnoma rekvizitlari Sozlamalardagi ma'lumotdan shakllanadi. Bajaruvchi
-- ustunidagi `Директор:` va `МФО:` qatorlari uchun CompanySettings da ustun
-- yo'q edi — shuning uchun ular shartnomada doim `—` bo'lib chiqardi.
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "director" TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "mfo" TEXT;
