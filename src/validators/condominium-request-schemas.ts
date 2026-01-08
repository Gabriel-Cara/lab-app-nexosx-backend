import { z } from "zod";

import { optionalPhoneSchema } from "@/validators/auth-schemas";

const condominiumCodeSchema = z
  .string()
  .trim()
  .min(2)
  .regex(/^[a-z0-9-]+$/i, "Code can contain letters, numbers, and hyphens only")
  .transform((value) => value.toLowerCase());

export const condominiumRequestCreateSchema = z.object({
  name: z.string().min(3),
  code: condominiumCodeSchema,
  adminName: z.string().min(3),
  adminEmail: z.string().email(),
  adminPhone: optionalPhoneSchema,
  adminPassword: z.string().min(8),
});

export const condominiumRequestIdSchema = z.object({
  id: z.uuid(),
});

export const condominiumRequestRejectSchema = z.object({
  reason: z.string().min(3).optional(),
});
