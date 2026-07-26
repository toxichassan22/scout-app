ALTER TABLE "PendingUpload" ADD COLUMN "leasedUntil" DATETIME;
ALTER TABLE "PendingUpload" ADD COLUMN "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "PendingUpload_status_leasedUntil_idx" ON "PendingUpload"("status", "leasedUntil");
CREATE INDEX IF NOT EXISTS "PendingUpload_status_nextAttemptAt_idx" ON "PendingUpload"("status", "nextAttemptAt");
