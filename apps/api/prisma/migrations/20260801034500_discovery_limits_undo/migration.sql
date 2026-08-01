CREATE TABLE "DiscoveryAction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undoneAt" TIMESTAMP(3),
    CONSTRAINT "DiscoveryAction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiscoveryAction_userId_idempotencyKey_key" ON "DiscoveryAction"("userId", "idempotencyKey");
CREATE INDEX "DiscoveryAction_userId_action_createdAt_idx" ON "DiscoveryAction"("userId", "action", "createdAt");
CREATE INDEX "DiscoveryAction_userId_createdAt_idx" ON "DiscoveryAction"("userId", "createdAt");

CREATE TABLE "DiscoveryDailyUsage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiscoveryDailyUsage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiscoveryDailyUsage_userId_action_day_key" ON "DiscoveryDailyUsage"("userId", "action", "day");
