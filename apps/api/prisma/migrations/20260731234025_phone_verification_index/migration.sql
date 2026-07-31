-- CreateIndex
CREATE INDEX "PhoneVerification_phoneNumber_verifiedAt_idx" ON "PhoneVerification"("phoneNumber", "verifiedAt");
