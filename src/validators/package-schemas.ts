import { z } from "zod";

export const packageCreateSchema = z.object({
  residentId: z.uuid(),
  description: z.string().min(3),
  carrier: z.string(),
});

export const packageParamsSchema = z.object({
  id: z.uuid(),
})

export const packageRetrieveSchema = z.object({
  code: z.string(),
})
