import { prisma } from "@/database/prisma";

export async function deleteUserWithRelations(userId: string) {
  const eventsCreated = await prisma.event.findMany({
    where: { createdById: userId },
    select: { id: true },
  });
  const eventIds = eventsCreated.map((event) => event.id);

  await prisma.$transaction([
    prisma.eventLike.deleteMany({
      where: { eventId: { in: eventIds } },
    }),
    prisma.eventBooking.deleteMany({
      where: { eventId: { in: eventIds } },
    }),
    prisma.event.deleteMany({
      where: { id: { in: eventIds } },
    }),
    prisma.eventLike.deleteMany({
      where: { userId },
    }),
    prisma.eventBooking.deleteMany({
      where: { residentId: userId },
    }),
    prisma.retrievalLog.deleteMany({
      where: {
        OR: [
          { verifiedById: userId },
          { package: { residentId: userId } },
          { package: { createdById: userId } },
        ],
      },
    }),
    prisma.package.deleteMany({
      where: {
        OR: [{ residentId: userId }, { createdById: userId }],
      },
    }),
    prisma.visitLog.updateMany({
      where: { handledById: userId },
      data: { handledById: null },
    }),
    prisma.visitLog.deleteMany({
      where: { hostId: userId },
    }),
    prisma.areaReservation.deleteMany({
      where: { residentId: userId },
    }),
    prisma.residentInfo.deleteMany({
      where: { userId },
    }),
    prisma.user.delete({
      where: { id: userId },
    }),
  ]);
}
