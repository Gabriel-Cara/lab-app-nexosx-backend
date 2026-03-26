import { z } from "zod";

import { optionalPhoneSchema } from "@/validators/auth-schemas";

export enum VisitorStatus {
  PENDING = "pending",
  AUTHORIZED = "authorized",
  DENIED = "denied",
}

const allowedHoursSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "string") {
      const normalizedValue = Number(value);

      if (!Number.isNaN(normalizedValue)) {
        return normalizedValue;
      }
    }

    return value;
  },
  z
    .number()
    .int("Informe uma quantidade inteira de horas.")
    .positive("Informe ao menos 1 hora.")
    .max(999, "Informe no máximo 999 horas.")
    .optional(),
);

export const visitorRegisterSchema = z.object({
  name: z.string().min(3),
  document: z.string().min(4),
  phone: optionalPhoneSchema,
  visitReason: z.string().optional(),
  hostId: z.uuid(),
  unlimitedAccess: z.boolean().default(false),
  allowedHours: allowedHoursSchema,
}).superRefine((data, ctx) => {
  if (!data.unlimitedAccess && data.allowedHours === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["allowedHours"],
      message: "Informe quantas horas o visitante pode permanecer.",
    });
  }
});

export const visitorParamsSchema = z.object({
  id: z.uuid(),
})
