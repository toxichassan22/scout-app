import { PrismaClient } from '@prisma/client';
import { requireExistingDatabase, resolveDatabasePath, sqliteFileUrl } from './sqlite-operations-lib.mjs';

const databasePath = resolveDatabasePath();
let prisma;

try {
    await requireExistingDatabase(databasePath);
    prisma = new PrismaClient({ datasources: { db: { url: sqliteFileUrl(databasePath) } } });
    await prisma.$connect();
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
    await prisma.$executeRawUnsafe(`
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
        )
    `);
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "JudgeTeamClaim_competitionId_teamId_key" ON "JudgeTeamClaim"("competitionId", "teamId")');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "JudgeTeamClaim_judgeId_competitionId_idx" ON "JudgeTeamClaim"("judgeId", "competitionId")');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "JudgeTeamClaim_expiresAt_idx" ON "JudgeTeamClaim"("expiresAt")');
    console.log(JSON.stringify({ status: 'ok', databasePath, table: 'JudgeTeamClaim' }, null, 2));
} catch (error) {
    console.error(`[db-apply-safe-tables] ${error.message}`);
    process.exitCode = 1;
} finally {
    await prisma?.$disconnect().catch(() => { });
}
