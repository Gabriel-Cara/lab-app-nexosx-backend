import { z } from "zod";

import { optionalPhoneSchema } from "@/validators/auth-schemas";

export enum VisitorStatus {
  PENDING = "pending",
  AUTHORIZED = "authorized",
  DENIED = "denied",
}

export const visitorRegisterSchema = z.object({
  name: z.string().min(3),
  document: z.string().min(4),
  phone: optionalPhoneSchema,
  visitReason: z.string().optional(),
  hostId: z.uuid(),
});

export const visitorParamsSchema = z.object({
  id: z.uuid(),
})
