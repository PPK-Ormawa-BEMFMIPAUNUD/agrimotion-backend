-- DropIndex
DROP INDEX "telemetry_deviceId_idx";

-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "battery" DOUBLE PRECISION,
ADD COLUMN     "signal" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'OFFLINE';

-- CreateIndex
CREATE INDEX "telemetry_deviceId_timestamp_idx" ON "telemetry"("deviceId", "timestamp" DESC);
