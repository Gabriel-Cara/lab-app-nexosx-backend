-- CreateEnum
CREATE TYPE "VisitorCategory" AS ENUM ('regular', 'vip');

-- AlterTable
ALTER TABLE "visitors"
ADD COLUMN     "category" "VisitorCategory" NOT NULL DEFAULT 'regular';

-- AlterTable
ALTER TABLE "visit-logs"
ADD COLUMN     "category" "VisitorCategory" NOT NULL DEFAULT 'regular';
