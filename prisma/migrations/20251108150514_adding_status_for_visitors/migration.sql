-- CreateEnum
CREATE TYPE "VisitorStatus" AS ENUM ('pending', 'authorized', 'denied');

-- AlterTable
ALTER TABLE "visit-logs" ALTER COLUMN "entry-time" DROP NOT NULL,
ALTER COLUMN "entry-time" DROP DEFAULT;

-- AlterTable
ALTER TABLE "visitors" ADD COLUMN     "status" "VisitorStatus" NOT NULL DEFAULT 'pending';
