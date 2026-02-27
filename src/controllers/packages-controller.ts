import { prisma } from "@/database/prisma";
import { notifyResident } from "@/services/notification-service";
import { AppError } from "@/utils/app-error";
import { generateCode } from "@/utils/generate-code";
import { PackageType, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { env } from "@/env";
import { requireCondominiumId } from "@/utils/condominium";
import {
  packageCreateSchema,
  packageParamsSchema,
  packageRetrieveSchema,
  packageUpdateSchema,
} from "@/validators/package-schemas";
import { Request, Response } from "express";

class PackagesController {
  async create(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { residentId, description, carrier, type } =
      packageCreateSchema.parse(request.body);

    const resident = await prisma.user.findFirst({
      where: { id: residentId, condominiumId, role: "resident" },
      select: { id: true },
    });

    if (!resident) {
      throw new AppError("Resident not found", 404);
    }

    const code = generateCode(6);
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + env.PACKAGE_CODE_TTL_MINUTES * 60 * 1000);
    const codeHint = `**${code.slice(-2)}`;

    const pkg = await prisma.package.create({
      data: {
        codeHash,
        codeExpiresAt: expiresAt,
        codeAttempts: 0,
        codeHint,
        residentId,
        description,
        carrier: carrier ?? null,
        type,
        status: "pending",
        createdById: request.user!.id,
        condominiumId,
      },
      select: {
        id: true,
        description: true,
        carrier: true,
        type: true,
        status: true,
        imageUrl: true,
        receivedAt: true,
        retrievedAt: true,
        deliveredAt: true,
        codeExpiresAt: true,
        codeHint: true,
        residentId: true,
        createdById: true,
        resident: { select: { name: true, phone: true } },
      },
    });

    const notification = await notifyResident({
      phone: pkg.resident.phone ?? undefined,
      message: `Olá ${pkg.resident.name}, sua encomenda chegou! Código de retirada: ${code}. (Válido por ${env.PACKAGE_CODE_TTL_MINUTES} minutos)`,
    });

    return response.status(201).json({ ...pkg, notification });
  }

  async resendCode(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = packageParamsSchema.parse(request.params);

    const pkg = await prisma.package.findFirst({
      where: { id, condominiumId },
      select: {
        id: true,
        status: true,
        residentId: true,
        resident: { select: { name: true, phone: true } },
      },
    });

    if (!pkg) {
      throw new AppError("Package not found", 404);
    }

    if (pkg.status === "retrieved") {
      throw new AppError("Package already retrieved", 400);
    }

    if (pkg.status === "cancelled") {
      throw new AppError("Package cancelled", 400);
    }

    if (pkg.status !== "pending" && pkg.status !== "delayed") {
      throw new AppError("Package is not pending", 400);
    }

    const code = generateCode(6);
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + env.PACKAGE_CODE_TTL_MINUTES * 60 * 1000);
    const codeHint = `**${code.slice(-2)}`;

    const notification = await notifyResident({
      phone: pkg.resident.phone ?? undefined,
      message: `Olá ${pkg.resident.name}, seu código de retirada foi reenviado: ${code}. (Válido por ${env.PACKAGE_CODE_TTL_MINUTES} minutos)`,
    });

    if (notification.status !== "sent") {
      const reasonMessage =
        notification.message ?? "não foi possível enviar o código ao morador.";
      const message = `Não foi possível reenviar o código: ${reasonMessage}`;
      const statusCode =
        notification.reason === "twilio_error" ||
        notification.reason === "twilio_not_configured" ||
        notification.reason === "twilio_from_missing"
          ? 502
          : 400;

      throw new AppError(message, statusCode);
    }

    await prisma.package.update({
      where: { id },
      data: {
        codeHash,
        codeExpiresAt: expiresAt,
        codeAttempts: 0,
        codeHint,
      },
    });

    return response.json({ ok: true });
  }

  async list(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { role, id } = request.user!;

    const where =
      role === "resident"
        ? { residentId: id, condominiumId }
        : { condominiumId };

    const packages = await prisma.package.findMany({
      where,
      select: {
        id: true,
        description: true,
        carrier: true,
        type: true,
        status: true,
        imageUrl: true,
        receivedAt: true,
        retrievedAt: true,
        deliveredAt: true,
        codeExpiresAt: true,
        codeHint: true,
        residentId: true,
        createdById: true,
        resident: { select: { name: true, apartment: true, phone: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { receivedAt: "desc" },
    });

    return response.json(packages);
  }

  async update(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = packageParamsSchema.parse(request.params);
    const { residentId, description, carrier, type } =
      packageUpdateSchema.parse(request.body);

    const pkg = await prisma.package.findFirst({
      where: { id, condominiumId },
    });

    if (!pkg) {
      throw new AppError("Package not found", 404);
    }

    if (residentId !== undefined) {
      const resident = await prisma.user.findFirst({
        where: { id: residentId, condominiumId, role: "resident" },
        select: { id: true },
      });

      if (!resident) {
        throw new AppError("Resident not found", 404);
      }
    }

    const data: {
      residentId?: string;
      description?: string;
      carrier?: string | null;
      type?: PackageType;
    } = {};

    if (residentId !== undefined) data.residentId = residentId;
    if (description !== undefined) data.description = description;
    if (carrier !== undefined) data.carrier = carrier ? carrier : null;
    if (type !== undefined) data.type = type;

    if (Object.keys(data).length === 0) {
      throw new AppError("No data provided", 400);
    }

    const updated = await prisma.package.update({
      where: { id },
      data,
      select: {
        id: true,
        description: true,
        carrier: true,
        type: true,
        status: true,
        imageUrl: true,
        receivedAt: true,
        retrievedAt: true,
        deliveredAt: true,
        codeExpiresAt: true,
        codeHint: true,
        residentId: true,
        createdById: true,
        resident: { select: { name: true, apartment: true, phone: true } },
        createdBy: { select: { name: true } },
      },
    });

    return response.json(updated);
  }

  async retrieve(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = packageParamsSchema.parse(request.params);

    if (!id) {
      throw new AppError("Must provide id", 400);
    }

    const parsed = packageRetrieveSchema.parse(request.body);
    const userId = request.user!.id;
    const now = new Date();

    try {
      const updated = await prisma.$transaction(
        async (tx) => {
          const pkg = await tx.package.findFirst({
            where: { id, condominiumId },
            select: {
              id: true,
              status: true,
              codeExpiresAt: true,
              codeAttempts: true,
              codeHash: true,
            },
          });

          if (!pkg) {
            throw new AppError("Package not found", 404);
          }

          if (pkg.status === "retrieved") {
            throw new AppError("Package already retrieved", 400);
          }

          if (now > pkg.codeExpiresAt) {
            throw new AppError("Código expirado", 400);
          }

          if (pkg.codeAttempts >= env.PACKAGE_CODE_MAX_ATTEMPTS) {
            throw new AppError("Número máximo de tentativas atingido!", 429);
          }

          const isValid = await bcrypt.compare(parsed.code, pkg.codeHash);
          if (!isValid) {
            await tx.package.update({
              where: { id },
              data: { codeAttempts: { increment: 1 } },
            });
            throw new AppError("Invalid code", 400);
          }

          const updateResult = await tx.package.updateMany({
            where: {
              id,
              condominiumId,
              status: { not: "retrieved" },
            },
            data: {
              retrievedAt: now,
              status: "retrieved",
              codeAttempts: 0,
            },
          });

          if (updateResult.count === 0) {
            throw new AppError("Package already retrieved", 400);
          }

          await tx.retrievalLog.create({
            data: {
              packageId: id,
              verifiedById: userId,
              method: "codigo",
              condominiumId,
            },
          });

          return tx.package.findFirst({
            where: { id, condominiumId },
            select: {
              id: true,
              description: true,
              carrier: true,
              type: true,
              status: true,
              imageUrl: true,
              receivedAt: true,
              retrievedAt: true,
              deliveredAt: true,
              codeExpiresAt: true,
              codeHint: true,
              residentId: true,
              createdById: true,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      if (!updated) {
        throw new AppError("Package not found", 404);
      }

      return response.json(updated);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2034") {
          throw new AppError("Conflict detected, please try again", 409);
        }
      }

      throw error;
    }
  }

  async cancel(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = packageParamsSchema.parse(request.params);

    if (!id) {
      throw new AppError("Must provide id", 400);
    }

    const pkg = await prisma.package.findFirst({
      where: { id, condominiumId },
    });

    if (!pkg) {
      throw new AppError("Package not found", 404);
    }

    const updated = await prisma.package.update({
      where: { id },
      data: {
        status: "cancelled",
      },
      select: {
        id: true,
        description: true,
        carrier: true,
        type: true,
        status: true,
        imageUrl: true,
        receivedAt: true,
        retrievedAt: true,
        deliveredAt: true,
        codeExpiresAt: true,
        codeHint: true,
        residentId: true,
        createdById: true,
      },
    });

    return response.json({ updated });
  }

  async delete(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = packageParamsSchema.parse(request.params);

    const pkg = await prisma.package.findFirst({
      where: { id, condominiumId },
    });

    if (!pkg) {
      throw new AppError("Package not found", 404);
    }

    await prisma.$transaction([
      prisma.retrievalLog.deleteMany({
        where: { packageId: id, condominiumId },
      }),
      prisma.package.delete({ where: { id } }),
    ]);

    return response.status(204).json();
  }
}

export { PackagesController };
