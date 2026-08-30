-- Dashboard ranking so'rovlarini tezlashtirish uchun kompozit indekslar.
-- calculateWorkerRanking: WHERE status='TAYYOR' AND assignedToId IS NOT NULL
--   AND completedAt BETWEEN :start AND :end
-- IF NOT EXISTS — drift bo'lsa ham xavfsiz qayta ishga tushadi.
CREATE INDEX IF NOT EXISTS "TaskStage_status_completedAt_idx" ON "TaskStage" ("status", "completedAt");
CREATE INDEX IF NOT EXISTS "TaskStage_assignedToId_completedAt_idx" ON "TaskStage" ("assignedToId", "completedAt");
