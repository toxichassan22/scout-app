CREATE TABLE IF NOT EXISTS "PendingUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "folderPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PendingUpload_status_createdAt_idx" ON "PendingUpload"("status", "createdAt");
