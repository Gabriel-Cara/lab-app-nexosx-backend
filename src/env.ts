import { z } from "zod";

const envSchema = z.object({
  JWT_SECRET: z.string(),
  DATABASE_URL: z.string(),
  NOTIFICATION_PROVIDER: z.string().default("console"),

   // Twilio (optional)
  // Used when NOTIFICATION_PROVIDER is "twilio_sms" or "twilio_whatsapp"
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  // e.g. +14155552671
  TWILIO_FROM_SMS: z.string().optional(),
  // e.g. whatsapp:+14155238886
  TWILIO_FROM_WHATSAPP: z.string().optional(),

  // Package pickup code settings
  PACKAGE_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(60 * 48),
  PACKAGE_CODE_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  FRONT_URL: z.string().url(),
  RESEND_API_KEY: z.string(),
  // For local/testing with Resend you can use: onboarding@resend.dev
  MAIL_FROM: z.string().default("onboarding@resend.dev"),
  PORT: z.coerce.number().default(3000)
});

export const env = envSchema.parse(process.env);
