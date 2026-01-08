import { Request, Response } from "express";

import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import { imageRemoveSchema, imageUploadSchema } from "@/validators/image-schemas";
import { requireCondominiumId } from "@/utils/condominium";

type AuthenticatedUser = NonNullable<Request["user"]>;

const staffRoles = new Set(["admin", "staff"]);
const visitRoles = new Set(["admin", "staff", "resident"]);

class ImagesController {
  async upload(request: Request, response: Response) {
    const user = requireUser(request);
    const condominiumId = requireCondominiumId(request);
    const { entityType, entityId, image } = imageUploadSchema.parse(request.body);
    const updated = await updateEntityImage({
      user,
      entityType,
      entityId,
      imageUrl: image,
      condominiumId,
    });

    return response.json(updated);
  }

  async remove(request: Request, response: Response) {
    const user = requireUser(request);
    const condominiumId = requireCondominiumId(request);
    const { entityType, entityId } = imageRemoveSchema.parse(request.body);
    const updated = await updateEntityImage({
      user,
      entityType,
      entityId,
      imageUrl: null,
      condominiumId,
    });

    return response.json(updated);
  }
}

export { ImagesController };

type ImageEntity = "package" | "visit" | "user" | "area" | "event";

function requireUser(request: Request): AuthenticatedUser {
  const user = request.user;
  if (!user) {
    throw new AppError("Unauthorized", 401);
  }
  return user;
}

function assertRole(user: AuthenticatedUser, roles: Set<string>) {
  if (!roles.has(user.role)) {
    throw new AppError("Unauthorized", 401);
  }
}

async function updateEntityImage(params: {
  user: AuthenticatedUser;
  entityType: ImageEntity;
  entityId: string;
  imageUrl: string | null;
  condominiumId: string;
}) {
  const { user, entityType, entityId, imageUrl, condominiumId } = params;

  if (entityType === "package") {
    assertRole(user, staffRoles);
    const pkg = await prisma.package.findFirst({
      where: { id: entityId, condominiumId },
      select: { id: true },
    });

    if (!pkg) {
      throw new AppError("Package not found", 404);
    }

    return prisma.package.update({
      where: { id: entityId },
      data: { imageUrl },
      select: { imageUrl: true },
    });
  }

  if (entityType === "area") {
    assertRole(user, staffRoles);
    const area = await prisma.commonArea.findFirst({
      where: { id: entityId, condominiumId },
      select: { id: true },
    });

    if (!area) {
      throw new AppError("Area not found", 404);
    }

    return prisma.commonArea.update({
      where: { id: entityId },
      data: { imageUrl },
      select: { imageUrl: true },
    });
  }

  if (entityType === "event") {
    assertRole(user, staffRoles);
    const event = await prisma.event.findFirst({
      where: { id: entityId, condominiumId },
      select: { id: true },
    });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    return prisma.event.update({
      where: { id: entityId },
      data: { imageUrl },
      select: { imageUrl: true },
    });
  }

  if (entityType === "visit") {
    assertRole(user, visitRoles);
    const log = await prisma.visitLog.findFirst({
      where: { id: entityId, condominiumId },
      select: { id: true, hostId: true },
    });

    if (!log) {
      throw new AppError("Visit not found", 404);
    }

    if (user.role === "resident" && log.hostId !== user.id) {
      throw new AppError("Unauthorized", 401);
    }

    return prisma.visitLog.update({
      where: { id: entityId },
      data: { imageUrl },
      select: { imageUrl: true },
    });
  }

  if (!staffRoles.has(user.role) && user.id !== entityId) {
    throw new AppError("Unauthorized", 401);
  }

  const existing = await prisma.user.findFirst({
    where: { id: entityId, condominiumId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError("User not found", 404);
  }

  return prisma.user.update({
    where: { id: entityId },
    data: { imageUrl },
    select: { imageUrl: true },
  });
}
