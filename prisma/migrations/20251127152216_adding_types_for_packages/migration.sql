-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('box', 'envelope', 'food', 'others');

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "type" "PackageType" NOT NULL DEFAULT 'others';
