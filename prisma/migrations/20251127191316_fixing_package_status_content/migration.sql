/*
  Warnings:

  - The values [delivered] on the enum `PackageStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PackageStatus_new" AS ENUM ('pending', 'retrieved', 'cancelled');
ALTER TABLE "public"."packages" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "packages" ALTER COLUMN "status" TYPE "PackageStatus_new" USING ("status"::text::"PackageStatus_new");
ALTER TYPE "PackageStatus" RENAME TO "PackageStatus_old";
ALTER TYPE "PackageStatus_new" RENAME TO "PackageStatus";
DROP TYPE "public"."PackageStatus_old";
ALTER TABLE "packages" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "delivered-at" TIMESTAMP(3);
