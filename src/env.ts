import { z } from "zod";

const envSchema = z.object({
  JWT_SECRET: z.string(),
  DATABASE_URL: z.string(),
  NOTIFICATION_PROVIDER: z.string().default("console"),
  FRONT_URL: z.string().url(),
  RESEND_API_KEY: z.string(),
  // For local/testing with Resend you can use: onboarding@resend.dev
  MAIL_FROM: z.string().default("onboarding@resend.dev"),
  PORT: z.coerce.number().default(3333)
});

export const env = envSchema.parse(process.env);
