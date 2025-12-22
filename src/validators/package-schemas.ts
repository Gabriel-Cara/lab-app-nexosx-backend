import { z } from "zod";

export const packageCreateSchema = z.object({
  residentId: z.uuid(),
  description: z.string().min(3),
  carrier: z.string(),
  type: z.enum(["box", "envelope", "food", "others"]).default("others"),
});

export const packageParamsSchema = z.object({
  id: z.uuid(),
})

export const packageRetrieveSchema = z.object({
  code: z.string(),
});
