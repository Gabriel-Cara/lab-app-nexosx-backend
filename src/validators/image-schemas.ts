import { z } from "zod";

const imageDataSchema = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith("data:image/") && value.includes(";base64,"),
    "Imagem inválida. Use data URL base64.",
  );

export const imageUploadSchema = z.object({
  entityType: z.enum(["package", "visit", "user", "area", "event"]),
  entityId: z.uuid(),
  image: imageDataSchema,
});

export const imageRemoveSchema = z.object({
  entityType: z.enum(["package", "visit", "user", "area", "event"]),
  entityId: z.uuid(),
});
