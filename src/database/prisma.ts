import { Prisma, PrismaClient } from "@prisma/client";

const isProduction = process.env.NODE_ENV === "production";
const logLevels: Prisma.LogLevel[] = isProduction
  ? ["warn", "error"]
  : ["query", "info", "warn", "error"];

export const prisma = new PrismaClient({
  log: logLevels,
});
