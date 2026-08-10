-- Link agenda entries to their canonical Competition record without changing existing rows.
-- Production applies this nullable column/index through db:columns because the baseline
-- SQLite database predates Prisma Migrate.
ALTER TABLE "AgendaItem" ADD COLUMN "competitionId" TEXT;
ALTER TABLE "AgendaItem" ADD COLUMN "locationNote" TEXT NOT NULL DEFAULT '';
CREATE INDEX "AgendaItem_competitionId_idx" ON "AgendaItem"("competitionId");
