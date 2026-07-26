-- DropIndex
DROP INDEX IF EXISTS "Score_teamId_idx";
DROP INDEX IF EXISTS "Score_teamId_submittedAt_idx";
DROP INDEX IF EXISTS "Question_competitionId_idx";
DROP INDEX IF EXISTS "JudgeScore_teamId_idx";
DROP INDEX IF EXISTS "ScoreAudit_teamId_idx";

-- CreateIndex
CREATE INDEX "Score_teamId_idx" ON "Score"("teamId");
CREATE INDEX "Score_teamId_submittedAt_idx" ON "Score"("teamId", "submittedAt");
CREATE INDEX "Question_competitionId_idx" ON "Question"("competitionId");
CREATE INDEX "JudgeScore_teamId_idx" ON "JudgeScore"("teamId");
CREATE INDEX "ScoreAudit_teamId_idx" ON "ScoreAudit"("teamId");
