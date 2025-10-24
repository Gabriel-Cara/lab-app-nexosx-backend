-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CommonArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommonArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaReservation" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "areaId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,

    CONSTRAINT "AreaReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AreaReservation_areaId_date_startTime_endTime_idx" ON "AreaReservation"("areaId", "date", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "AreaReservation" ADD CONSTRAINT "AreaReservation_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "CommonArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaReservation" ADD CONSTRAINT "AreaReservation_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
