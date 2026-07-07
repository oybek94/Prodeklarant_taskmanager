-- AiCheckResult: NEEDS_REVIEW — tekshiruv o'tkazilolmagan yoki faqat
-- warning-darajali nomuvofiqliklar topilgan holat (odam ko'rib chiqishi kerak).
-- AiCheckType: INVOICE_VS_DB — yuklangan invoys PDF'ini bazadagi Invoice bilan
-- solishtirish (shu jumladan umumiy summa va valyuta).
-- IF NOT EXISTS — idempotent: drift bo'lgan bazada qayta ishga tushirish xavfsiz.
ALTER TYPE "AiCheckResult" ADD VALUE IF NOT EXISTS 'NEEDS_REVIEW';
ALTER TYPE "AiCheckType" ADD VALUE IF NOT EXISTS 'INVOICE_VS_DB';
