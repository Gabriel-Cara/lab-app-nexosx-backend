import { z } from 'zod';

const timeStringSchema = z.string().regex(/^\d{2}:\d{2}$/);
const scheduleSchema = z.object({
  start: timeStringSchema,
  end: timeStringSchema,
  stepMinutes: z.number().int().positive().optional(),
});

export const createAreaSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  available: z.boolean().optional(),
  schedule: scheduleSchema.optional(),
});

export const updateAreaSchema = createAreaSchema.partial();

export const areaParamsSchema = z.object({
  id: z.uuid(),
});

export const areaSlotsQuerySchema = z.object({
  date: z.string().datetime(),
});

export const areaSlotsRangeQuerySchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime().optional(),
});
