-- CreateEnum
CREATE TYPE "CondominiumRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "condominium-requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "admin-name" TEXT NOT NULL,
    "admin-email" TEXT NOT NULL,
    "admin-phone" TEXT,
    "admin-password-hash" TEXT NOT NULL,
    "status" "CondominiumRequestStatus" NOT NULL DEFAULT 'pending',
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided-at" TIMESTAMP(3),
    "rejection-reason" TEXT,
    "decision-by-id" TEXT,
    "condominium-id" TEXT,

    CONSTRAINT "condominium-requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "condominium-requests_code_key" ON "condominium-requests"("code");
CREATE INDEX "condominium-requests_status_idx" ON "condominium-requests"("status");

-- AddForeignKey
ALTER TABLE "condominium-requests" ADD CONSTRAINT "condominium-requests_decision-by-id_fkey" FOREIGN KEY ("decision-by-id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "condominium-requests" ADD CONSTRAINT "condominium-requests_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE SET NULL ON UPDATE CASCADE;
