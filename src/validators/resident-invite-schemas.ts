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

const residentVehicleSchema = z.object({
  model: z.string().min(1),
  plate: z.string().min(1),
  year: z.coerce.number().int(),
});

const vehiclesSchema = z.array(residentVehicleSchema).optional();

export const residentInviteCreateSchema = z.object({});

export const residentInviteTokenSchema = z.object({
  token: z.string().min(20),
});

export const residentSignupSchema = z.object({
  token: z.string().min(20),
  name: z.string().min(3),
  email: z.string().email(),
  phone: optionalPhoneSchema,
  apartment: z.string().min(1),
  building: optionalTextSchema,
  vehicles: vehiclesSchema,
  emergencyContact: optionalTextSchema,
  password: optionalPasswordSchema,
});
