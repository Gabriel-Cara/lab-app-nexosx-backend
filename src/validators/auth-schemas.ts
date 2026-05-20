import { z } from "zod";
import { normalizePhoneE164 } from "@/utils/phone";
import { normalizeParkingSpot, normalizeVehiclePlate } from "@/utils/vehicle";

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

const residentVehicleSchema = z.object({
  model: z.string().min(1),
  plate: z.string().min(1).refine(
    (value) => normalizeVehiclePlate(value).length > 0,
    "Placa inválida"
  ),
  parkingSpot: z.string().min(1).refine(
    (value) => normalizeParkingSpot(value).length > 0,
    "Vaga inválida"
  ),
  year: z.coerce.number().int(),
});

const vehiclesSchema = z.array(residentVehicleSchema).optional();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const userCreateSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: optionalPhoneSchema,
  role: z.enum(["manager", "doorman", "resident"]),
  apartment: z.string().optional(),
  residenceId: z.uuid().optional(),
  shift: z.string().optional(),
  password: z.string().min(6).optional(),
  building: z.string().optional(),
  vehicles: vehiclesSchema,
  emergencyContact: z.string().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phone: optionalPhoneSchema,
  role: z.enum(["manager", "doorman", "resident"]).optional(),
  apartment: z.string().optional(),
  residenceId: z.uuid().optional(),
  shift: z.string().optional(),
  password: z.string().min(6).optional(),
  building: z.string().optional(),
  vehicles: vehiclesSchema,
  emergencyContact: z.string().optional(),
});

export const updateProfileSchema = z.object({
  phone: optionalPhoneSchema,
  vehicles: vehiclesSchema,
  emergencyContact: z.string().optional(),
});

export const userIdParamsSchema = z.object({
  id: z.uuid(),
});

export const paramsSchema = z.object({
  name: z.string().optional(),
  apartment: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["manager", "resident", "doorman"]).optional(),
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
