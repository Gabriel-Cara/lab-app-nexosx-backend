-- AlterTable
ALTER TABLE "packages" ADD COLUMN "image-url" TEXT;

-- AlterTable
ALTER TABLE "visit-logs" ADD COLUMN "image-url" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "image-url" TEXT;
