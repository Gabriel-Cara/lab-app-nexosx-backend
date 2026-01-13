-- CreateTable
CREATE TABLE "resident-invites" (
    "id" TEXT NOT NULL,
    "token-hash" TEXT NOT NULL,
    "condominium-id" TEXT NOT NULL,
    "created-by-id" TEXT,
    "expires-at" TIMESTAMP(3) NOT NULL,
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resident-invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor-invites" (
    "id" TEXT NOT NULL,
    "token-hash" TEXT NOT NULL,
    "condominium-id" TEXT NOT NULL,
    "host-id" TEXT NOT NULL,
    "created-by-id" TEXT,
    "expires-at" TIMESTAMP(3) NOT NULL,
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor-invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resident-invites_token-hash_key" ON "resident-invites"("token-hash");
CREATE INDEX "resident-invites_condominium-id_idx" ON "resident-invites"("condominium-id");
CREATE INDEX "resident-invites_expires-at_idx" ON "resident-invites"("expires-at");

-- CreateIndex
CREATE UNIQUE INDEX "visitor-invites_token-hash_key" ON "visitor-invites"("token-hash");
CREATE INDEX "visitor-invites_condominium-id_idx" ON "visitor-invites"("condominium-id");
CREATE INDEX "visitor-invites_host-id_idx" ON "visitor-invites"("host-id");
CREATE INDEX "visitor-invites_expires-at_idx" ON "visitor-invites"("expires-at");

-- AddForeignKey
ALTER TABLE "resident-invites" ADD CONSTRAINT "resident-invites_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resident-invites" ADD CONSTRAINT "resident-invites_created-by-id_fkey" FOREIGN KEY ("created-by-id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "visitor-invites" ADD CONSTRAINT "visitor-invites_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visitor-invites" ADD CONSTRAINT "visitor-invites_host-id_fkey" FOREIGN KEY ("host-id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visitor-invites" ADD CONSTRAINT "visitor-invites_created-by-id_fkey" FOREIGN KEY ("created-by-id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
