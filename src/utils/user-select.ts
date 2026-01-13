import type { Prisma } from "@prisma/client";

export const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  imageUrl: true,
  role: true,
  condominiumId: true,
  apartment: true,
  shift: true,
  createdAt: true,
  updatedAt: true,
  residents: {
    select: {
      id: true,
      userId: true,
      building: true,
      vehicle: true,
      emergencyContact: true,
    },
  },
} satisfies Prisma.UserSelect;
