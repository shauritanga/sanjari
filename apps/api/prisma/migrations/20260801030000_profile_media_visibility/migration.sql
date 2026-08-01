ALTER TABLE "Profile"
ADD COLUMN "visibilitySettings" JSONB;

ALTER TABLE "ProfilePhoto"
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "sizeBytes" INTEGER,
ADD COLUMN "processingStatus" TEXT NOT NULL DEFAULT 'pending_scan';
