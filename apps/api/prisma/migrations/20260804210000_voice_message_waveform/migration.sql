-- AlterTable
ALTER TABLE "MessageAttachment" ADD COLUMN     "waveform" JSONB,
ADD COLUMN     "durationSeconds" DOUBLE PRECISION;
