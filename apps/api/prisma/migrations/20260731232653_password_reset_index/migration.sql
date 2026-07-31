-- CreateIndex
CREATE INDEX "PasswordReset_tokenHash_usedAt_idx" ON "PasswordReset"("tokenHash", "usedAt");
