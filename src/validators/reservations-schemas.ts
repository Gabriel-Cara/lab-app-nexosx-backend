import { z } from "zod";

export const createReservationSchema = z.object({
  areaId: z.uuid(),
  date: z.string(),
  startSlotId: z.string().uuid(),
  endSlotId: z.string().uuid(),
  purpose: z.string().optional()
});

export const actionSchema = z.object({
  id: z.uuid(),
})

export const reservationQuerySchema = z.object({
  areaId: z.uuid().optional(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})
