-- AlterTable
ALTER TABLE "resident-infos" DROP COLUMN "vehicle";

-- AlterTable
ALTER TABLE "resident-infos" ADD COLUMN "vehicle-model" TEXT;
ALTER TABLE "resident-infos" ADD COLUMN "vehicle-plate" TEXT;
ALTER TABLE "resident-infos" ADD COLUMN "vehicle-year" INTEGER;
