ALTER TABLE "Judge" ADD COLUMN "judgeDeviceId" TEXT;

CREATE TABLE IF NOT EXISTS "JudgeTeamClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JudgeTeamClaim_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JudgeTeamClaim_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JudgeTeamClaim_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "Judge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "JudgeTeamClaim_competitionId_teamId_key" ON "JudgeTeamClaim"("competitionId", "teamId");
CREATE INDEX IF NOT EXISTS "JudgeTeamClaim_judgeId_competitionId_idx" ON "JudgeTeamClaim"("judgeId", "competitionId");
CREATE INDEX IF NOT EXISTS "JudgeTeamClaim_expiresAt_idx" ON "JudgeTeamClaim"("expiresAt");
