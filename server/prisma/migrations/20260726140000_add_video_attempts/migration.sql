-- CreateTable
CREATE TABLE "VideoAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "videoUrl" TEXT,
    "videoStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoAttempt_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoAttempt_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoAttempt_competitionId_teamId_attemptNumber_key" ON "VideoAttempt"("competitionId", "teamId", "attemptNumber");
CREATE INDEX "VideoAttempt_competitionId_teamId_idx" ON "VideoAttempt"("competitionId", "teamId");
