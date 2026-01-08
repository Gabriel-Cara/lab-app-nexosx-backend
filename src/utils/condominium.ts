import type { Request } from "express";

import { AppError } from "@/utils/app-error";

export function requireCondominiumId(request: Request) {
  const condominiumId = request.user?.condominiumId;

  if (!condominiumId) {
    throw new AppError("Condominium not selected", 403);
  }

  return condominiumId;
}
