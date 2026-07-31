/*
  Warnings:

  - The required column `tokenFamilyId` was added to the `UserSession` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN     "tokenFamilyId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "UserSession_tokenFamilyId_revokedAt_idx" ON "UserSession"("tokenFamilyId", "revokedAt");

-- CreateIndex
CREATE INDEX "UserSession_refreshTokenHash_idx" ON "UserSession"("refreshTokenHash");
