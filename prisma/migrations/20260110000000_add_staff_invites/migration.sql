-- CreateTable
CREATE TABLE "staff-invites" (
    "id" TEXT NOT NULL,
    "token-hash" TEXT NOT NULL,
    "condominium-id" TEXT NOT NULL,
    "created-by-id" TEXT,
    "expires-at" TIMESTAMP(3) NOT NULL,
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff-invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff-invites_token-hash_key" ON "staff-invites"("token-hash");
CREATE INDEX "staff-invites_condominium-id_idx" ON "staff-invites"("condominium-id");
CREATE INDEX "staff-invites_expires-at_idx" ON "staff-invites"("expires-at");

-- AddForeignKey
ALTER TABLE "staff-invites" ADD CONSTRAINT "staff-invites_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staff-invites" ADD CONSTRAINT "staff-invites_created-by-id_fkey" FOREIGN KEY ("created-by-id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
