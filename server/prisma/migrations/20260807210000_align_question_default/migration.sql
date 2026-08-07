PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "options" TEXT NOT NULL,
    "correctOption" INTEGER NOT NULL,
    "points" REAL NOT NULL DEFAULT 1,
    "questionType" TEXT NOT NULL DEFAULT 'text',
    "mediaUrl" TEXT,
    "mediaAlt" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Question_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("category", "competitionId", "correctOption", "createdAt", "id", "mediaAlt", "mediaUrl", "options", "points", "questionType", "sortOrder", "text")
SELECT "category", "competitionId", "correctOption", "createdAt", "id", "mediaAlt", "mediaUrl", "options", "points", "questionType", "sortOrder", "text" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
CREATE INDEX "Question_competitionId_idx" ON "Question"("competitionId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
