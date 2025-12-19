-- CreateTable
CREATE TABLE "password-setup-tokens" (
    "id" TEXT NOT NULL,
    "user-id" TEXT NOT NULL,
    "token-hash" TEXT NOT NULL,
    "expires-at" TIMESTAMP(3) NOT NULL,
    "used-at" TIMESTAMP(3),
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password-setup-tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password-setup-tokens_user-id_key" ON "password-setup-tokens"("user-id");

-- CreateIndex
CREATE UNIQUE INDEX "password-setup-tokens_token-hash_key" ON "password-setup-tokens"("token-hash");

-- CreateIndex
CREATE INDEX "password-setup-tokens_expires-at_idx" ON "password-setup-tokens"("expires-at");

-- AddForeignKey
ALTER TABLE "password-setup-tokens" ADD CONSTRAINT "password-setup-tokens_user-id_fkey" FOREIGN KEY ("user-id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
