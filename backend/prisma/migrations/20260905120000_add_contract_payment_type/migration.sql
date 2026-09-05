-- Shartnoma to'lov turi: mijoz sertifikat/bojxona to'lovlarini o'zi to'laydigan
-- yangi holatlar uchun (TRANSFER_ONLY/CASH_ONLY/MIXED) davlat to'lovlari
-- netProfit'dan ayirilmasligi kerak. CASH_ALL_INCLUSIVE — legacy, DEFAULT,
-- mavjud mijoz/tasklar uchun xatti-harakat o'zgarmaydi.
-- Skript idempotent: qayta ishga tushirilsa xato bermaydi.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractPaymentType') THEN
    CREATE TYPE "ContractPaymentType" AS ENUM ('CASH_ALL_INCLUSIVE', 'TRANSFER_ONLY', 'CASH_ONLY', 'MIXED');
  END IF;
END $$;

ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "contractPaymentType" "ContractPaymentType" NOT NULL DEFAULT 'CASH_ALL_INCLUSIVE';

ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "serviceFeeTransferUzs" DECIMAL(18,2);

ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "snapshotContractPaymentType" "ContractPaymentType";

ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "snapshotServiceFeeTransferUzs" DECIMAL(18,2);

-- Mavjud tasklar legacy bo'lib qolsin: mijoz sozlamasi keyin o'zgarsa ham
-- eski tasklar raqamlari o'zgarmaydi (spec, qaror 1). Status bo'yicha filtr
-- yo'q — band (hali yakunlanmagan) tasklar ham shu funksiya yaratilishidan
-- oldin ochilgan, shuning uchun legacy bo'lib qoladi.
UPDATE "Task" SET "snapshotContractPaymentType" = 'CASH_ALL_INCLUSIVE'
  WHERE "snapshotContractPaymentType" IS NULL;
