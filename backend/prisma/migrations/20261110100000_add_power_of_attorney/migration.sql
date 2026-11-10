-- Haydovchiga beriladigan ishonchnoma (cargo.customs.uz 50-grafa): invoysga 1:1, raqam INN + sana bo'yicha
CREATE TABLE IF NOT EXISTS "PowerOfAttorney" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "exporterInn" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "sequence" INTEGER NOT NULL,
    "pinfl" TEXT NOT NULL,
    "lastName" TEXT,
    "firstName" TEXT,
    "patronymic" TEXT,
    "passport" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PowerOfAttorney_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PowerOfAttorney_invoiceId_key" ON "PowerOfAttorney"("invoiceId");
CREATE UNIQUE INDEX IF NOT EXISTS "PowerOfAttorney_exporterInn_issueDate_sequence_key" ON "PowerOfAttorney"("exporterInn", "issueDate", "sequence");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PowerOfAttorney_invoiceId_fkey') THEN
    ALTER TABLE "PowerOfAttorney"
      ADD CONSTRAINT "PowerOfAttorney_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
