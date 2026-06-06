-- AlterTable: Client
ALTER TABLE "Client" ALTER COLUMN "dealAmountCurrency" SET DEFAULT 'UZS';
ALTER TABLE "Client" ALTER COLUMN "initialDebtCurrency" SET DEFAULT 'UZS';

-- AlterTable: Transaction
ALTER TABLE "Transaction" ALTER COLUMN "currency" SET DEFAULT 'UZS';

-- AlterTable: WorkerPayment
ALTER TABLE "WorkerPayment" ALTER COLUMN "paidCurrency" SET DEFAULT 'UZS';

-- AlterTable: TaskError
ALTER TABLE "TaskError" ALTER COLUMN "currency" SET DEFAULT 'UZS';

-- AlterTable: KpiLog
ALTER TABLE "KpiLog" ALTER COLUMN "currency" SET DEFAULT 'UZS';

-- AlterTable: AccountBalance
ALTER TABLE "AccountBalance" ALTER COLUMN "currency" SET DEFAULT 'UZS';

-- AlterTable: Debt
ALTER TABLE "Debt" ALTER COLUMN "currency" SET DEFAULT 'UZS';

-- AlterTable: PreviousYearWorkerDebt
ALTER TABLE "PreviousYearWorkerDebt" ALTER COLUMN "currency" SET DEFAULT 'UZS';

-- AlterTable: DebtPayment
ALTER TABLE "DebtPayment" ALTER COLUMN "currency" SET DEFAULT 'UZS';
