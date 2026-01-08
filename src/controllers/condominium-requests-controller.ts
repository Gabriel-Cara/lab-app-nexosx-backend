import { Request, Response } from "express";
import { hash } from "bcrypt";

import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import {
  condominiumRequestCreateSchema,
  condominiumRequestIdSchema,
  condominiumRequestRejectSchema,
} from "@/validators/condominium-request-schemas";

class CondominiumRequestsController {
  async create(request: Request, response: Response) {
    const parsed = condominiumRequestCreateSchema.parse(request.body);

    const existingCondo = await prisma.condominium.findUnique({
      where: { code: parsed.code },
      select: { id: true },
    });

    if (existingCondo) {
      throw new AppError("Condominium already exists", 400);
    }

    const existingRequest = await prisma.condominiumRequest.findUnique({
      where: { code: parsed.code },
      select: { id: true, status: true },
    });

    if (existingRequest) {
      throw new AppError("Condominium request already exists", 400);
    }

    const passwordHash = await hash(parsed.adminPassword, 8);

    const created = await prisma.condominiumRequest.create({
      data: {
        name: parsed.name,
        code: parsed.code,
        adminName: parsed.adminName,
        adminEmail: parsed.adminEmail,
        adminPhone: parsed.adminPhone ?? null,
        adminPasswordHash: passwordHash,
      },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        createdAt: true,
      },
    });

    return response.status(201).json(created);
  }

  async list(request: Request, response: Response) {
    const status = request.query.status?.toString();

    const requests = await prisma.condominiumRequest.findMany({
      where:
        status && ["pending", "approved", "rejected"].includes(status)
          ? { status: status as "pending" | "approved" | "rejected" }
          : undefined,
      orderBy: { createdAt: "desc" },
    });

    return response.json(requests);
  }

  async approve(request: Request, response: Response) {
    const { id } = condominiumRequestIdSchema.parse(request.params);
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const requestRecord = await prisma.condominiumRequest.findUnique({
      where: { id },
    });

    if (!requestRecord) {
      throw new AppError("Request not found", 404);
    }

    if (requestRecord.status !== "pending") {
      throw new AppError("Request already processed", 400);
    }

    const existingCondo = await prisma.condominium.findUnique({
      where: { code: requestRecord.code },
      select: { id: true },
    });

    if (existingCondo) {
      throw new AppError("Condominium already exists", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const condominium = await tx.condominium.create({
        data: {
          name: requestRecord.name,
          code: requestRecord.code,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          name: requestRecord.adminName,
          email: requestRecord.adminEmail,
          phone: requestRecord.adminPhone ?? null,
          password: requestRecord.adminPasswordHash,
          role: "admin",
          condominiumId: condominium.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      const updatedRequest = await tx.condominiumRequest.update({
        where: { id },
        data: {
          status: "approved",
          decidedAt: new Date(),
          decisionById: userId,
          condominiumId: condominium.id,
        },
        select: {
          id: true,
          status: true,
          decidedAt: true,
        },
      });

      return { condominium, adminUser, updatedRequest };
    });

    return response.json({
      condominium: {
        id: result.condominium.id,
        name: result.condominium.name,
        code: result.condominium.code,
      },
      admin: result.adminUser,
      request: result.updatedRequest,
    });
  }

  async reject(request: Request, response: Response) {
    const { id } = condominiumRequestIdSchema.parse(request.params);
    const { reason } = condominiumRequestRejectSchema.parse(request.body ?? {});
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const requestRecord = await prisma.condominiumRequest.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!requestRecord) {
      throw new AppError("Request not found", 404);
    }

    if (requestRecord.status !== "pending") {
      throw new AppError("Request already processed", 400);
    }

    const updated = await prisma.condominiumRequest.update({
      where: { id },
      data: {
        status: "rejected",
        decidedAt: new Date(),
        decisionById: userId,
        rejectionReason: reason ?? null,
      },
      select: {
        id: true,
        status: true,
        decidedAt: true,
      },
    });

    return response.json(updated);
  }
}

export { CondominiumRequestsController };
