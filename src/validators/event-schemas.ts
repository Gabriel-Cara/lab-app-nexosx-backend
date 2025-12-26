import { z } from "zod";

export const eventCreateSchema = z
  .object({
    title: z.string().min(3),
    description: z.string().optional(),
    commonAreaId: z.uuid(),
    capacity: z.number().int().positive(),
    allowBookings: z.boolean().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const eventUpdateSchema = z
  .object({
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    commonAreaId: z.uuid().optional(),
    capacity: z.number().int().positive().optional(),
    allowBookings: z.boolean().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) =>
      data.startDate === undefined ||
      data.endDate === undefined ||
      data.endDate >= data.startDate,
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

export const eventIdParamsSchema = z.object({
  id: z.uuid(),
});

export const bookingCreateSchema = z.object({
  eventId: z.uuid(),
  notes: z.string().optional(),
});
