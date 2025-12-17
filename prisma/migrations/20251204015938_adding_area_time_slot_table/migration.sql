-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "end-slot-id" TEXT,
ADD COLUMN     "start-slot-id" TEXT;

-- CreateTable
CREATE TABLE "area-time-slots" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "starts-at" TEXT NOT NULL,
    "ends-at" TEXT NOT NULL,
    "is-active" BOOLEAN NOT NULL DEFAULT true,
    "sort-order" INTEGER,
    "area-id" TEXT NOT NULL,

    CONSTRAINT "area-time-slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "area-time-slots_area-id_starts-at_ends-at_key" ON "area-time-slots"("area-id", "starts-at", "ends-at");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_start-slot-id_fkey" FOREIGN KEY ("start-slot-id") REFERENCES "area-time-slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_end-slot-id_fkey" FOREIGN KEY ("end-slot-id") REFERENCES "area-time-slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "area-time-slots" ADD CONSTRAINT "area-time-slots_area-id_fkey" FOREIGN KEY ("area-id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
