-- CreateTable
CREATE TABLE "YearlyGoalConfig" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "targetTasks" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YearlyGoalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "YearlyGoalConfig_year_key" ON "YearlyGoalConfig"("year");
