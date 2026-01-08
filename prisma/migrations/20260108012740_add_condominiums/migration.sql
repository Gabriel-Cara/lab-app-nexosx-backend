-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'master';

-- CreateTable
CREATE TABLE "condominiums" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated-at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condominiums_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "condominiums_code_key" ON "condominiums"("code");

-- DropIndex
DROP INDEX IF EXISTS "users_email_key";
DROP INDEX IF EXISTS "visitors_document_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "condominium-id" TEXT;
ALTER TABLE "resident-infos" ADD COLUMN     "condominium-id" TEXT NOT NULL;
ALTER TABLE "visitors" ADD COLUMN     "condominium-id" TEXT NOT NULL;
ALTER TABLE "visit-logs" ADD COLUMN     "condominium-id" TEXT NOT NULL;
ALTER TABLE "packages" ADD COLUMN     "condominium-id" TEXT NOT NULL;
ALTER TABLE "retrieval-logs" ADD COLUMN     "condominium-id" TEXT NOT NULL;
ALTER TABLE "events" ADD COLUMN     "condominium-id" TEXT NOT NULL;
ALTER TABLE "events-booking" ADD COLUMN     "condominium-id" TEXT NOT NULL;
ALTER TABLE "event-likes" ADD COLUMN     "condominium-id" TEXT NOT NULL;
ALTER TABLE "areas" ADD COLUMN     "condominium-id" TEXT NOT NULL;
ALTER TABLE "reservations" ADD COLUMN     "condominium-id" TEXT NOT NULL;
ALTER TABLE "area-time-slots" ADD COLUMN     "condominium-id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "areas_condominium-id_name_key" ON "areas"("condominium-id", "name");
CREATE UNIQUE INDEX "users_condominium-id_email_key" ON "users"("condominium-id", "email");
CREATE UNIQUE INDEX "visitors_condominium-id_document_key" ON "visitors"("condominium-id", "document");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resident-infos" ADD CONSTRAINT "resident-infos_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visit-logs" ADD CONSTRAINT "visit-logs_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "packages" ADD CONSTRAINT "packages_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "retrieval-logs" ADD CONSTRAINT "retrieval-logs_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events-booking" ADD CONSTRAINT "events-booking_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event-likes" ADD CONSTRAINT "event-likes_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "areas" ADD CONSTRAINT "areas_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "area-time-slots" ADD CONSTRAINT "area-time-slots_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
