-- AlterEnum: Add new TaskStatus values
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'INVOICE_READY';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'ST_READY';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'FITO_READY';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'PASSED_AI_CHECK';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'RETURNED';

-- CreateEnum: DocumentType
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'ST', 'FITO', 'OTHER');

-- CreateEnum: AiCheckType
CREATE TYPE "AiCheckType" AS ENUM ('INVOICE_ST');

-- CreateEnum: AiCheckResult
CREATE TYPE "AiCheckResult" AS ENUM ('PASS', 'FAIL');

-- AlterTable: Add documentType to TaskDocument
ALTER TABLE "TaskDocument" ADD COLUMN IF NOT EXISTS "documentType" "DocumentType";

-- CreateTable: DocumentMetadata
CREATE TABLE IF NOT EXISTS "DocumentMetadata" (
    "id" SERIAL NOT NULL,
    "taskDocumentId" INTEGER NOT NULL,
    "extractedText" TEXT NOT NULL,
    "pageCount" INTEGER,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StructuredDocument
CREATE TABLE IF NOT EXISTS "StructuredDocument" (
    "id" SERIAL NOT NULL,
    "taskDocumentId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "structuredData" JSONB NOT NULL,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StructuredDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AiCheck
CREATE TABLE IF NOT EXISTS "AiCheck" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "checkType" "AiCheckType" NOT NULL,
    "result" "AiCheckResult" NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentMetadata_taskDocumentId_key" ON "DocumentMetadata"("taskDocumentId");
CREATE UNIQUE INDEX IF NOT EXISTS "StructuredDocument_taskDocumentId_key" ON "StructuredDocument"("taskDocumentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DocumentMetadata_taskDocumentId_idx" ON "DocumentMetadata"("taskDocumentId");
CREATE INDEX IF NOT EXISTS "StructuredDocument_taskId_idx" ON "StructuredDocument"("taskId");
CREATE INDEX IF NOT EXISTS "StructuredDocument_taskDocumentId_idx" ON "StructuredDocument"("taskDocumentId");
CREATE INDEX IF NOT EXISTS "StructuredDocument_documentType_idx" ON "StructuredDocument"("documentType");
CREATE INDEX IF NOT EXISTS "TaskDocument_documentType_idx" ON "TaskDocument"("documentType");
CREATE INDEX IF NOT EXISTS "AiCheck_taskId_idx" ON "AiCheck"("taskId");
CREATE INDEX IF NOT EXISTS "AiCheck_checkType_idx" ON "AiCheck"("checkType");
CREATE INDEX IF NOT EXISTS "AiCheck_result_idx" ON "AiCheck"("result");
CREATE INDEX IF NOT EXISTS "AiCheck_createdAt_idx" ON "AiCheck"("createdAt");

-- AddForeignKey
ALTER TABLE "DocumentMetadata" ADD CONSTRAINT "DocumentMetadata_taskDocumentId_fkey" FOREIGN KEY ("taskDocumentId") REFERENCES "TaskDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StructuredDocument" ADD CONSTRAINT "StructuredDocument_taskDocumentId_fkey" FOREIGN KEY ("taskDocumentId") REFERENCES "TaskDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StructuredDocument" ADD CONSTRAINT "StructuredDocument_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiCheck" ADD CONSTRAINT "AiCheck_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

