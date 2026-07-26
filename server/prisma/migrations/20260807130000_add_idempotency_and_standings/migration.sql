-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TeamStanding" (
    "teamId" TEXT NOT NULL PRIMARY KEY,
    "totalScore" REAL NOT NULL DEFAULT 0,
    "latestSubmitted" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamStanding_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_scope_actorId_idx" ON "IdempotencyKey"("scope", "actorId");

-- CreateIndex
CREATE INDEX "TeamStanding_totalScore_latestSubmitted_idx" ON "TeamStanding"("totalScore", "latestSubmitted");

-- Seed standings from existing scores so the leaderboard stays correct immediately after deploy.
INSERT INTO "TeamStanding" ("teamId", "totalScore", "latestSubmitted", "updatedAt")
SELECT t.id, COALESCE(SUM(s.total), 0), MAX(s."submittedAt"), CURRENT_TIMESTAMP
FROM "Team" t
LEFT JOIN "Score" s ON s."teamId" = t.id
GROUP BY t.id;
