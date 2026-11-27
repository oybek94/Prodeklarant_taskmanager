-- Yuk arizasidan avtomatik yaratilgan vazifa
ALTER TABLE "ClientCargoDraft" ADD COLUMN "taskId" INTEGER;

CREATE UNIQUE INDEX "ClientCargoDraft_taskId_key" ON "ClientCargoDraft"("taskId");

ALTER TABLE "ClientCargoDraft" ADD CONSTRAINT "ClientCargoDraft_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
