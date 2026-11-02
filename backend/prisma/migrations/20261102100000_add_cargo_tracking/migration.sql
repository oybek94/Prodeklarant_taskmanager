-- Haydovchi boti: yukka bog'langan qisqa kod, haydovchi Telegram hisobi va joylashuv kuzatuvi
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CargoTrackingStatus') THEN
    CREATE TYPE "CargoTrackingStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CargoTrackingCreatedVia') THEN
    CREATE TYPE "CargoTrackingCreatedVia" AS ENUM ('STAFF', 'CLIENT_GROUP');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CargoTracking" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "status" "CargoTrackingStatus" NOT NULL DEFAULT 'WAITING',
    "driverTelegramId" BIGINT,
    "driverChatId" BIGINT,
    "boundAt" TIMESTAMP(3),
    "lastLat" DOUBLE PRECISION,
    "lastLng" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "livePeriodEndsAt" TIMESTAMP(3),
    "lastPromptAt" TIMESTAMP(3),
    "lastAddress" TEXT,
    "createdById" INTEGER,
    "createdVia" "CargoTrackingCreatedVia" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "CargoTracking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CargoTrackingPoint" (
    "id" SERIAL NOT NULL,
    "trackingId" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CargoTrackingPoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CargoTracking_taskId_key" ON "CargoTracking"("taskId");
CREATE UNIQUE INDEX IF NOT EXISTS "CargoTracking_code_key" ON "CargoTracking"("code");
CREATE INDEX IF NOT EXISTS "CargoTracking_clientId_status_idx" ON "CargoTracking"("clientId", "status");
CREATE INDEX IF NOT EXISTS "CargoTracking_driverTelegramId_status_idx" ON "CargoTracking"("driverTelegramId", "status");
CREATE INDEX IF NOT EXISTS "CargoTracking_status_idx" ON "CargoTracking"("status");
CREATE INDEX IF NOT EXISTS "CargoTrackingPoint_trackingId_recordedAt_idx" ON "CargoTrackingPoint"("trackingId", "recordedAt");
CREATE INDEX IF NOT EXISTS "CargoTrackingPoint_recordedAt_idx" ON "CargoTrackingPoint"("recordedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CargoTracking_taskId_fkey') THEN
    ALTER TABLE "CargoTracking" ADD CONSTRAINT "CargoTracking_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CargoTracking_clientId_fkey') THEN
    ALTER TABLE "CargoTracking" ADD CONSTRAINT "CargoTracking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CargoTrackingPoint_trackingId_fkey') THEN
    ALTER TABLE "CargoTrackingPoint" ADD CONSTRAINT "CargoTrackingPoint_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "CargoTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
