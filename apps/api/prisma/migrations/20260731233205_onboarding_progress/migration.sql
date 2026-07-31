-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "completionScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "publishedAt" TIMESTAMP(3);
