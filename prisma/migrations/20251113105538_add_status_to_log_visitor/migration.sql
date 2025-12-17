-- AlterTable
ALTER TABLE "visit-logs" ADD COLUMN     "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "VisitorStatus" NOT NULL DEFAULT 'pending';
