import { z } from "zod";

import { optionalPhoneSchema } from "@/validators/auth-schemas";

const condominiumCodeSchema = z
  .string()
  .trim()
  .min(2)
  .regex(/^[a-z0-9-]+$/i, "Code can contain letters, numbers, and hyphens only")
  .transform((value) => value.toLowerCase());

export const condominiumCreateSchema = z.object({
  name: z.string().min(3),
  code: condominiumCodeSchema,
  admin: z.object({
    name: z.string().min(3),
    email: z.string().email(),
    phone: optionalPhoneSchema,
    password: z.string().min(8),
  }),
});
