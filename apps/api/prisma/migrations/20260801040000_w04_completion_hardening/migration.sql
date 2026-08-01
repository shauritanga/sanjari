CREATE TABLE "RankingEvaluation" (
    "id" UUID NOT NULL,
    "rankingVersion" TEXT NOT NULL,
    "shown" INTEGER NOT NULL,
    "acted" INTEGER NOT NULL,
    "matched" INTEGER NOT NULL,
    "actionRate" DECIMAL(8,6) NOT NULL,
    "matchRate" DECIMAL(8,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RankingEvaluation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RankingEvaluation_rankingVersion_createdAt_idx" ON "RankingEvaluation"("rankingVersion", "createdAt");

CREATE TABLE "LocationAnomaly" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "previousLocationId" UUID,
    "currentLocationId" UUID NOT NULL,
    "distanceKm" DECIMAL(10,2) NOT NULL,
    "elapsedMinutes" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LocationAnomaly_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LocationAnomaly_userId_createdAt_idx" ON "LocationAnomaly"("userId", "createdAt");
