CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Activity_slug_key" ON "Activity"("slug");

CREATE TABLE "ActivitySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "roomCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "minPlayers" INTEGER NOT NULL DEFAULT 1,
    "maxPlayers" INTEGER NOT NULL DEFAULT 10,
    "gameState" TEXT NOT NULL DEFAULT '{}',
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "rewardsApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivitySession_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ActivitySession_roomCode_key" ON "ActivitySession"("roomCode");
CREATE INDEX "ActivitySession_activityId_status_idx" ON "ActivitySession"("activityId", "status");

CREATE TABLE "ActivityParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "score" REAL NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "eliminated" BOOLEAN NOT NULL DEFAULT false,
    "eliminatedAt" DATETIME,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "ActivityParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ActivitySession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ActivityParticipant_sessionId_deviceId_key" ON "ActivityParticipant"("sessionId", "deviceId");
CREATE INDEX "ActivityParticipant_sessionId_teamId_idx" ON "ActivityParticipant"("sessionId", "teamId");

CREATE TABLE "TeamWallet" (
    "teamId" TEXT NOT NULL PRIMARY KEY,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamWallet_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "activityId" TEXT,
    "sessionId" TEXT,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WalletTransaction_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WalletTransaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ActivitySession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "WalletTransaction_teamId_createdAt_idx" ON "WalletTransaction"("teamId", "createdAt");

CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'cosmetic',
    "price" INTEGER NOT NULL,
    "effect" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ShopItem_slug_key" ON "ShopItem"("slug");

CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "effectSnapshot" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Purchase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Purchase_teamId_createdAt_idx" ON "Purchase"("teamId", "createdAt");
