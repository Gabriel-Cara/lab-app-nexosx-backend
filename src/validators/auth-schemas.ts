import { z } from "zod";
import { normalizePhoneE164 } from "@/utils/phone";

const phoneSchema = z.string().transform((value, ctx) => {
  const normalized = normalizePhoneE164(value);

  if (!normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Telefone inválido. Use DDD + número.",
    });
    return z.NEVER;
  }

  return normalized;
});

export const optionalPhoneSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  phoneSchema.optional()
);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const userCreateSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: optionalPhoneSchema,
  role: z.enum(["admin", "staff", "resident"]),
  apartment: z.string().optional(),
  shift: z.string().optional(),
  password: z.string().min(6).optional(),
  building: z.string().optional(),
  vehicle: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phone: optionalPhoneSchema,
  role: z.enum(["admin", "staff", "resident"]).optional(),
  apartment: z.string().optional(),
  shift: z.string().optional(),
  password: z.string().min(6).optional(),
  building: z.string().optional(),
  vehicle: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export const updateProfileSchema = z.object({
  phone: optionalPhoneSchema,
  vehicle: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export const userIdParamsSchema = z.object({
  id: z.uuid(),
});

export const paramsSchema = z.object({
  name: z.string().optional(),
  apartment: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["admin", "resident", "staff"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const setupPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});
