import { z } from "zod";

export const blockCreateSchema = z.object({
  name: z.string().trim().min(1),
});

export const blockUpdateSchema = blockCreateSchema.partial();

export const blockParamsSchema = z.object({
  id: z.uuid(),
});
