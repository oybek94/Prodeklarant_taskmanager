-- CreateTable
CREATE TABLE "TrainingStage" (
    "id" SERIAL NOT NULL,
    "trainingId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingStep" (
    "id" SERIAL NOT NULL,
    "stageId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingStage_trainingId_idx" ON "TrainingStage"("trainingId");

-- CreateIndex
CREATE INDEX "TrainingStage_trainingId_orderIndex_idx" ON "TrainingStage"("trainingId", "orderIndex");

-- CreateIndex
CREATE INDEX "TrainingStep_stageId_idx" ON "TrainingStep"("stageId");

-- CreateIndex
CREATE INDEX "TrainingStep_stageId_orderIndex_idx" ON "TrainingStep"("stageId", "orderIndex");

-- AddForeignKey
ALTER TABLE "TrainingStage" ADD CONSTRAINT "TrainingStage_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingStep" ADD CONSTRAINT "TrainingStep_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TrainingStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: TrainingMaterial - qo'shish stepId va trainingId'ni optional qilish
ALTER TABLE "TrainingMaterial" ADD COLUMN "stepId" INTEGER;
ALTER TABLE "TrainingMaterial" ALTER COLUMN "trainingId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "TrainingMaterial_stepId_idx" ON "TrainingMaterial"("stepId");

-- AddForeignKey
ALTER TABLE "TrainingMaterial" ADD CONSTRAINT "TrainingMaterial_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "TrainingStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: TrainingProgress - qo'shish stageId va stepId
ALTER TABLE "TrainingProgress" ADD COLUMN "stageId" INTEGER;
ALTER TABLE "TrainingProgress" ADD COLUMN "stepId" INTEGER;

-- CreateIndex
CREATE INDEX "TrainingProgress_stageId_idx" ON "TrainingProgress"("stageId");
CREATE INDEX "TrainingProgress_stepId_idx" ON "TrainingProgress"("stepId");

