import { z } from "zod";

const envSchema = z.object({
  JWT_SECRET: z.string(),
  DATABASE_URL: z.string(),
  NOTIFICATION_PROVIDER: z.string().default("console"),
  PORT: z.coerce.number().default(3333)
});

export const env = envSchema.parse(process.env);