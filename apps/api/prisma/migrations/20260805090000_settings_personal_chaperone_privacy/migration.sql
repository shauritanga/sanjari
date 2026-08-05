-- AlterTable
ALTER TABLE "User" ADD COLUMN "phoneNumberHash" TEXT;
CREATE UNIQUE INDEX "User_phoneNumberHash_key" ON "User"("phoneNumberHash");

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "visibleToLikedOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "Profile_shareToken_key" ON "Profile"("shareToken");

-- CreateTable
CREATE TABLE "ChaperoneContact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "forwardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaperoneContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChaperoneContact_userId_key" ON "ChaperoneContact"("userId");
CREATE INDEX "ChaperoneContact_userId_forwardEnabled_idx" ON "ChaperoneContact"("userId", "forwardEnabled");
