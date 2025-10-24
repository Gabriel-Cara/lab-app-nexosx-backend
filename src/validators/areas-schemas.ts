import { z } from 'zod';

export const createAreaSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  available: z.boolean().optional()
});

export const updateAreaSchema = createAreaSchema.partial();

export const areaParamsSchema = z.object({
  id: z.uuid(),
});
