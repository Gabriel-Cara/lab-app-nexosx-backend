import { prisma } from "@/database/prisma";

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const FOOD_DEADLINE_DAYS = 1;
const DEFAULT_DEADLINE_DAYS = 30;

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * DAY_IN_MS);
}

export async function syncDelayedPackages() {
  const now = new Date();
  const foodDeadline = subtractDays(now, FOOD_DEADLINE_DAYS);
  const defaultDeadline = subtractDays(now, DEFAULT_DEADLINE_DAYS);

  await prisma.$transaction([
    prisma.package.updateMany({
      where: {
        status: "pending",
        type: "food",
        receivedAt: { lte: foodDeadline },
      },
      data: {
        status: "delayed",
      },
    }),
    prisma.package.updateMany({
      where: {
        status: "pending",
        NOT: { type: "food" },
        receivedAt: { lte: defaultDeadline },
      },
      data: {
        status: "delayed",
      },
    }),
  ]);
}
