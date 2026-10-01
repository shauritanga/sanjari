-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "ethnicities" TEXT[],
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "nationalities" TEXT[],
ADD COLUMN     "personalityTraits" TEXT[],
ADD COLUMN     "screenshotProtectionEnabled" BOOLEAN NOT NULL DEFAULT false;
