-- CreateTable
CREATE TABLE "CertifierFeeConfig" (
    "id" SERIAL NOT NULL,
    "st1Rate" DECIMAL(12,2) NOT NULL,
    "fitoRate" DECIMAL(12,2) NOT NULL,
    "aktRate" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertifierFeeConfig_pkey" PRIMARY KEY ("id")
);
