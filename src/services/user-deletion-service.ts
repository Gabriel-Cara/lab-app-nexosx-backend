import { prisma } from "@/database/prisma";

export async function deleteUserWithRelations(userId: string, condominiumId: string) {
  const eventsCreated = await prisma.event.findMany({
    where: { createdById: userId, condominiumId },
    select: { id: true },
  });
  const eventIds = eventsCreated.map((event) => event.id);

  await prisma.$transaction([
    prisma.eventLike.deleteMany({
      where: { eventId: { in: eventIds }, condominiumId },
    }),
    prisma.eventBooking.deleteMany({
      where: { eventId: { in: eventIds }, condominiumId },
    }),
    prisma.event.deleteMany({
      where: { id: { in: eventIds }, condominiumId },
    }),
    prisma.eventLike.deleteMany({
      where: { userId, condominiumId },
    }),
    prisma.eventBooking.deleteMany({
      where: { residentId: userId, condominiumId },
    }),
    prisma.retrievalLog.deleteMany({
      where: {
        condominiumId,
        OR: [
          { verifiedById: userId },
          { package: { residentId: userId } },
          { package: { createdById: userId } },
        ],
      },
    }),
    prisma.package.deleteMany({
      where: {
        condominiumId,
        OR: [{ residentId: userId }, { createdById: userId }],
      },
    }),
    prisma.visitLog.updateMany({
      where: { handledById: userId, condominiumId },
      data: { handledById: null },
    }),
    prisma.visitLog.deleteMany({
      where: { hostId: userId, condominiumId },
    }),
    prisma.areaReservation.deleteMany({
      where: { residentId: userId, condominiumId },
    }),
    prisma.residentInfo.deleteMany({
      where: { userId, condominiumId },
    }),
    prisma.user.delete({
      where: { id: userId },
    }),
  ]);
}
