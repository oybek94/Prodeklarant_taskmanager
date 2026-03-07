-- CreateTable
CREATE TABLE IF NOT EXISTS "PreviousYearWorkerDebt" (
    "id" SERIAL NOT NULL,
    "workerId" INTEGER NOT NULL,
    "totalEarned" DECIMAL(12,2) NOT NULL,
    "totalPaid" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "year" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreviousYearWorkerDebt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PreviousYearWorkerDebt_workerId_year_key" ON "PreviousYearWorkerDebt"("workerId", "year");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PreviousYearWorkerDebt_workerId_idx" ON "PreviousYearWorkerDebt"("workerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PreviousYearWorkerDebt_year_idx" ON "PreviousYearWorkerDebt"("year");

-- AddForeignKey
ALTER TABLE "PreviousYearWorkerDebt" ADD CONSTRAINT "PreviousYearWorkerDebt_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

