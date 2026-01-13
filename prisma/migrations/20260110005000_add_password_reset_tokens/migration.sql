-- CreateTable
CREATE TABLE "password-reset-tokens" (
    "id" TEXT NOT NULL,
    "user-id" TEXT NOT NULL,
    "token-hash" TEXT NOT NULL,
    "expires-at" TIMESTAMP(3) NOT NULL,
    "used-at" TIMESTAMP(3),
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password-reset-tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password-reset-tokens_token-hash_key" ON "password-reset-tokens"("token-hash");
CREATE INDEX "password-reset-tokens_user-id_idx" ON "password-reset-tokens"("user-id");
CREATE INDEX "password-reset-tokens_expires-at_idx" ON "password-reset-tokens"("expires-at");

-- AddForeignKey
ALTER TABLE "password-reset-tokens" ADD CONSTRAINT "password-reset-tokens_user-id_fkey" FOREIGN KEY ("user-id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
