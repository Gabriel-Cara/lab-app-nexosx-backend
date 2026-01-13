import { z } from "zod";

import { optionalPhoneSchema } from "@/validators/auth-schemas";

const optionalPasswordSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().min(8, "Password must be at least 8 characters long").optional()
);

const optionalTextSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().optional()
);

export const staffInviteCreateSchema = z.object({
  condominiumId: z.string().uuid().optional(),
});

export const staffInviteTokenSchema = z.object({
  token: z.string().min(20),
});

export const staffSignupSchema = z.object({
  token: z.string().min(20),
  name: z.string().min(3),
  email: z.string().email(),
  phone: optionalPhoneSchema,
  shift: optionalTextSchema,
  password: optionalPasswordSchema,
});
