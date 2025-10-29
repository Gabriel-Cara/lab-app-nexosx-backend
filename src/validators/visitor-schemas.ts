import { z } from "zod";

export const visitorRegisterSchema = z.object({
  name: z.string().min(3),
  document: z.string().min(4),
  phone: z.string().optional(),
  visitReason: z.string().optional(),
  hostId: z.uuid(),
});

export const visitorExitSchema = z.object({
  notes: z.string().optional(),
});

export const visitorParamsSchema = z.object({
  id: z.uuid(),
})
