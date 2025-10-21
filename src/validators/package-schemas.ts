import { z } from "zod";

export const packageCreateSchema = z.object({
  residentId: z.uuid(),
  description: z.string().min(3),
  carrier: z.string(),
});