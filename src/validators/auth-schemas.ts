import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const userCreateSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8).optional(),
  role: z.enum(["admin", "staff", "resident"]),
  apartment: z.string().optional(),
  password: z.string().min(6).optional(),
  building: z.string().optional(),
  vehicle: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  role: z.enum(["admin", "staff", "resident"]).optional(),
  apartment: z.string().optional(),
  password: z.string().min(6).optional(),
  building: z.string().optional(),
  vehicle: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export const updateProfileSchema = z.object({
  phone: z.string().optional(),
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
