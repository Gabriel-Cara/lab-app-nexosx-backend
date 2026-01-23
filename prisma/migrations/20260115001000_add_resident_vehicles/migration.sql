-- AlterTable
ALTER TABLE "resident-infos" DROP COLUMN "vehicle-model";
ALTER TABLE "resident-infos" DROP COLUMN "vehicle-plate";
ALTER TABLE "resident-infos" DROP COLUMN "vehicle-year";

-- CreateTable
CREATE TABLE "resident-vehicles" (
    "id" TEXT NOT NULL,
    "resident-info-id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "resident-vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resident-vehicles_resident-info-id_idx" ON "resident-vehicles"("resident-info-id");

-- AddForeignKey
ALTER TABLE "resident-vehicles" ADD CONSTRAINT "resident-vehicles_resident-info-id_fkey" FOREIGN KEY ("resident-info-id") REFERENCES "resident-infos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
