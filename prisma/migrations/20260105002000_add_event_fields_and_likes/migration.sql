-- AlterTable
ALTER TABLE "events" ADD COLUMN "allow-bookings" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "image-url" TEXT;

-- CreateTable
CREATE TABLE "event-likes" (
    "id" TEXT NOT NULL,
    "event-id" TEXT NOT NULL,
    "user-id" TEXT NOT NULL,
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event-likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events-booking_event-id_resident-id_key" ON "events-booking"("event-id", "resident-id");

-- CreateIndex
CREATE UNIQUE INDEX "event-likes_event-id_user-id_key" ON "event-likes"("event-id", "user-id");

-- AddForeignKey
ALTER TABLE "event-likes" ADD CONSTRAINT "event-likes_event-id_fkey" FOREIGN KEY ("event-id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event-likes" ADD CONSTRAINT "event-likes_user-id_fkey" FOREIGN KEY ("user-id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
