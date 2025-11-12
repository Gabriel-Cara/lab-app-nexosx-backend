import { z } from "zod";

export enum VisitorStatus {
  PENDING = "pending",
  AUTHORIZED = "authorized",
  DENIED = "denied",
}

export const visitorRegisterSchema = z.object({
  name: z.string().min(3),
  document: z.string().min(4),
  phone: z.string().optional(),
  visitReason: z.string().optional(),
  hostId: z.uuid(),
});

export const visitorActionSchema = z.object({
  notes: z.string().optional(),
});

export const visitorParamsSchema = z.object({
  id: z.uuid(),
})
