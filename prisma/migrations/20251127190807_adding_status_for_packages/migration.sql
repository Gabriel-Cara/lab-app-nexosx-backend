-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('pending', 'delivered', 'retrieved', 'cancelled');

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "status" "PackageStatus" NOT NULL DEFAULT 'pending';
