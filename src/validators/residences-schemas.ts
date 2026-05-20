import { z } from "zod";

export const residenceCreateSchema = z.object({
  number: z.string().trim().min(1),
  blockId: z.uuid(),
});

export const residenceUpdateSchema = z.object({
  number: z.string().trim().min(1).optional(),
  blockId: z.uuid().optional(),
});

export const residenceParamsSchema = z.object({
  id: z.uuid(),
});

export const residenceQuerySchema = z.object({
  blockId: z.uuid().optional(),
  search: z.string().optional(),
});
