-- CreateTable
CREATE TABLE "WorkerPayment" (
    "id" SERIAL NOT NULL,
    "workerId" INTEGER NOT NULL,
    "earnedAmountUsd" DECIMAL(14,2) NOT NULL,
    "paidCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(10,4),
    "paidAmountUzs" DECIMAL(16,2),
    "paidAmountUsd" DECIMAL(14,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkerPayment_workerId_idx" ON "WorkerPayment"("workerId");

-- CreateIndex
CREATE INDEX "WorkerPayment_paymentDate_idx" ON "WorkerPayment"("paymentDate");

-- AddForeignKey
ALTER TABLE "WorkerPayment" ADD CONSTRAINT "WorkerPayment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

