-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_branchId_idx" ON "Task"("branchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_clientId_idx" ON "Task"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_createdAt_idx" ON "Task"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_branchId_status_idx" ON "Task"("branchId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_clientId_status_idx" ON "Task"("clientId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_status_createdAt_idx" ON "Task"("status", "createdAt");

