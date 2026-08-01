ALTER TABLE "Pass" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Pass_senderId_idempotencyKey_key" ON "Pass"("senderId", "idempotencyKey");
