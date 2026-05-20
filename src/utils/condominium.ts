import type { Request } from "express";

import { AppError } from "@/utils/app-error";

function firstString(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
}

export function requireCondominiumId(request: Request) {
  const tokenCondominiumId = request.user?.condominiumId;

  if (tokenCondominiumId) {
    return tokenCondominiumId;
  }

  if (request.user?.role === "admin") {
    const headerCondominiumId = firstString(request.headers["x-condominium-id"]);
    const queryCondominiumId = firstString(request.query.condominiumId);
    const bodyCondominiumId =
      request.body && typeof request.body === "object"
        ? firstString((request.body as { condominiumId?: unknown }).condominiumId)
        : undefined;

    const condominiumId = headerCondominiumId ?? queryCondominiumId ?? bodyCondominiumId;

    if (condominiumId) {
      return condominiumId;
    }
  }

  throw new AppError("Condominium not selected", 403);
}
