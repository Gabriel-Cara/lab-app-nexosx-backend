import { z } from "zod";

export const eventCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  commonAreaId: z.uuid(),
  capacity: z.number().int().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const bookingCreateSchema = z.object({
  eventId: z.uuid(),
  notes: z.string().optional(),
});
