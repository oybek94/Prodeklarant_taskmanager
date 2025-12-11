-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "driverPhone" TEXT,
ADD COLUMN     "hasPsr" BOOLEAN NOT NULL DEFAULT false;
