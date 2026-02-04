-- CreateTable
CREATE TABLE "RegionCode" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "externalCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegionCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegionCode_name_idx" ON "RegionCode"("name");

-- CreateIndex
CREATE INDEX "RegionCode_internalCode_idx" ON "RegionCode"("internalCode");

-- CreateIndex
CREATE INDEX "RegionCode_externalCode_idx" ON "RegionCode"("externalCode");
