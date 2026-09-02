-- Narx turi: BHM koeffitsienti (avvalgi yagona xatti-harakat) yoki so'mdagi qat'iy summa.
-- Mavjud shartnomalar DEFAULT orqali 'BHM' bo'lib qoladi — hujjat matni o'zgarmaydi.
-- Skript idempotent: qayta ishga tushirilsa xato bermaydi.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PricingMode') THEN
    CREATE TYPE "PricingMode" AS ENUM ('BHM', 'FIXED');
  END IF;
END $$;

ALTER TABLE "ServiceAgreement"
  ADD COLUMN IF NOT EXISTS "pricingMode" "PricingMode" NOT NULL DEFAULT 'BHM';

-- So'mdagi qat'iy BYuD narxi — mainTariffBhm Decimal(6,2) ga sig'maydi
ALTER TABLE "ServiceAgreement"
  ADD COLUMN IF NOT EXISTS "mainTariffUzs" DECIMAL(18,2);
