-- AlterTable
ALTER TABLE "visitors"
ADD COLUMN     "allowed-hours" INTEGER,
ADD COLUMN     "unlimited-access" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "visit-logs"
ADD COLUMN     "allowed-hours" INTEGER,
ADD COLUMN     "expected-exit-time" TIMESTAMP(3),
ADD COLUMN     "unlimited-access" BOOLEAN NOT NULL DEFAULT false;

-- Backfill
UPDATE "visitors"
SET "unlimited-access" = CASE WHEN "category" = 'vip' THEN true ELSE false END;

UPDATE "visit-logs"
SET "unlimited-access" = CASE WHEN "category" = 'vip' THEN true ELSE false END;

-- Drop old category model
ALTER TABLE "visitors" DROP COLUMN "category";
ALTER TABLE "visit-logs" DROP COLUMN "category";

DROP TYPE "VisitorCategory";
