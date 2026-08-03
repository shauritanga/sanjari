-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastActiveAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DiscoveryPreference" ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "DiscoveryPreference" ADD COLUMN "interests" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "DiscoveryPreference" ADD COLUMN "verifiedOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "replyToMessageId" UUID;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
