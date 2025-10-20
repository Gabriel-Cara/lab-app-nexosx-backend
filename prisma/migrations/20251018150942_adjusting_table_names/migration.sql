/*
  Warnings:

  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventBooking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Package` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResidentInfo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RetrievalLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VisitLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Visitor` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Event" DROP CONSTRAINT "Event_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventBooking" DROP CONSTRAINT "EventBooking_event-id_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventBooking" DROP CONSTRAINT "EventBooking_resident-id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Package" DROP CONSTRAINT "Package_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Package" DROP CONSTRAINT "Package_residentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ResidentInfo" DROP CONSTRAINT "ResidentInfo_user-id_fkey";

-- DropForeignKey
ALTER TABLE "public"."RetrievalLog" DROP CONSTRAINT "RetrievalLog_package-id_fkey";

-- DropForeignKey
ALTER TABLE "public"."RetrievalLog" DROP CONSTRAINT "RetrievalLog_verifiedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."VisitLog" DROP CONSTRAINT "VisitLog_handledById_fkey";

-- DropForeignKey
ALTER TABLE "public"."VisitLog" DROP CONSTRAINT "VisitLog_host-id_fkey";

-- DropForeignKey
ALTER TABLE "public"."VisitLog" DROP CONSTRAINT "VisitLog_visitor-id_fkey";

-- DropTable
DROP TABLE "public"."Event";

-- DropTable
DROP TABLE "public"."EventBooking";

-- DropTable
DROP TABLE "public"."Package";

-- DropTable
DROP TABLE "public"."ResidentInfo";

-- DropTable
DROP TABLE "public"."RetrievalLog";

-- DropTable
DROP TABLE "public"."User";

-- DropTable
DROP TABLE "public"."VisitLog";

-- DropTable
DROP TABLE "public"."Visitor";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'resident',
    "apartment" TEXT,
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated-at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resident-infos" (
    "id" TEXT NOT NULL,
    "user-id" TEXT NOT NULL,
    "building" TEXT,
    "vehicle" TEXT,
    "emergency-contact" TEXT,

    CONSTRAINT "resident-infos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "phone" TEXT,
    "visit-reason" TEXT,
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated-at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit-logs" (
    "id" TEXT NOT NULL,
    "visitor-id" TEXT NOT NULL,
    "host-id" TEXT NOT NULL,
    "entry-time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exit-time" TIMESTAMP(3),
    "notes" TEXT,
    "handledById" TEXT,

    CONSTRAINT "visit-logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "carrier" TEXT,
    "received-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retrieved-at" TIMESTAMP(3),
    "residentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retrieval-logs" (
    "id" TEXT NOT NULL,
    "package-id" TEXT NOT NULL,
    "verifiedById" TEXT NOT NULL,
    "verified-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,

    CONSTRAINT "retrieval-logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "start-date" TIMESTAMP(3) NOT NULL,
    "end-date" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events-booking" (
    "id" TEXT NOT NULL,
    "event-id" TEXT NOT NULL,
    "resident-id" TEXT NOT NULL,
    "notes" TEXT,
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events-booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "resident-infos_user-id_key" ON "resident-infos"("user-id");

-- CreateIndex
CREATE UNIQUE INDEX "visitors_document_key" ON "visitors"("document");

-- CreateIndex
CREATE UNIQUE INDEX "packages_code_key" ON "packages"("code");

-- AddForeignKey
ALTER TABLE "resident-infos" ADD CONSTRAINT "resident-infos_user-id_fkey" FOREIGN KEY ("user-id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit-logs" ADD CONSTRAINT "visit-logs_visitor-id_fkey" FOREIGN KEY ("visitor-id") REFERENCES "visitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit-logs" ADD CONSTRAINT "visit-logs_host-id_fkey" FOREIGN KEY ("host-id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit-logs" ADD CONSTRAINT "visit-logs_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval-logs" ADD CONSTRAINT "retrieval-logs_package-id_fkey" FOREIGN KEY ("package-id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval-logs" ADD CONSTRAINT "retrieval-logs_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events-booking" ADD CONSTRAINT "events-booking_event-id_fkey" FOREIGN KEY ("event-id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events-booking" ADD CONSTRAINT "events-booking_resident-id_fkey" FOREIGN KEY ("resident-id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
