import { z } from "zod";

export const createReservationSchema = z.object({
  areaId: z.uuid(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  purpose: z.string().optional()
});

export const actionSchema = z.object({
  id: z.uuid(),
})

export const reservationQuerySchema = z.object({
  areaId: z.uuid().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
})