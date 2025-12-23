import { prisma } from "@/database/prisma";
import { syncDelayedPackages } from "@/services/package-status-service";
import { notifyResident } from "@/services/notification-service";
import { AppError } from "@/utils/app-error";
import { generateCode } from "@/utils/generate-code";
import { PackageType } from "@prisma/client";
import bcrypt from "bcrypt";
import { env } from "@/env";
import {
  packageCreateSchema,
  packageParamsSchema,
  packageRetrieveSchema,
  packageUpdateSchema,
} from "@/validators/package-schemas";
import { Request, Response } from "express";

class PackagesController {
  async create(request: Request, response: Response) {
    const { residentId, description, carrier, type } =
      packageCreateSchema.parse(request.body);

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
      },
      select: {
        id: true,
        description: true,
        carrier: true,
        type: true,
        status: true,
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

    if (pkg.resident.phone) {
      await notifyResident({
        phone: pkg.resident.phone,
        message: `Olá ${pkg.resident.name}, sua encomenda chegou! Código de retirada: ${code}. (Válido por ${env.PACKAGE_CODE_TTL_MINUTES} minutos)`,
      });
    }

    return response.status(201).json(pkg);
  }

  async list(request: Request, response: Response) {
    const { role, id } = request.user!;

    const where = role === "resident" ? { residentId: id } : undefined;

    await syncDelayedPackages();

    const packages = await prisma.package.findMany({
      ...(where ? { where } : {}),
      select: {
        id: true,
        description: true,
        carrier: true,
        type: true,
        status: true,
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
    const { id } = packageParamsSchema.parse(request.params);
    const { residentId, description, carrier, type } =
      packageUpdateSchema.parse(request.body);

    const pkg = await prisma.package.findUnique({ where: { id } });

    if (!pkg) {
      throw new AppError("Package not found", 404);
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
    const { id } = packageParamsSchema.parse(request.params);

    if (!id) {
      throw new AppError("Must provide id", 400);
    }

    const parsed = packageRetrieveSchema.parse(request.body);

    const pkg = await prisma.package.findUnique({ where: { id } });

    if (!pkg) {
      throw new AppError("Package not found", 404);
    }

    if (pkg.status === "retrieved") {
      throw new AppError("Package already retrieved", 400);
    }

    if (new Date() > pkg.codeExpiresAt) {
      throw new AppError("Código expirado", 400);
    }

    if (pkg.codeAttempts >= env.PACKAGE_CODE_MAX_ATTEMPTS) {
      throw new AppError("Número máximo de tentativas atingido!", 429);
    }

    const isValid = await bcrypt.compare(parsed.code, pkg.codeHash);
    if (!isValid) {
      await prisma.package.update({
        where: { id },
        data: { codeAttempts: { increment: 1 } },
      });
      throw new AppError("Invalid code", 400);
    }

    const updated = await prisma.package.update({
      where: { id },
      data: {
        retrievedAt: new Date(),
        status: "retrieved",
        codeAttempts: 0,
        retrievalLogs: {
          create: {
            verifiedById: request.user!.id,
            method: "codigo",
          },
        },
      },
      select: {
        id: true,
        description: true,
        carrier: true,
        type: true,
        status: true,
        receivedAt: true,
        retrievedAt: true,
        deliveredAt: true,
        codeExpiresAt: true,
        codeHint: true,
        residentId: true,
        createdById: true,
      },
    });

    return response.json(updated);
  }

  async cancel(request: Request, response: Response) {
    const { id } = packageParamsSchema.parse(request.params);

    if (!id) {
      throw new AppError("Must provide id", 400);
    }

    const pkg = await prisma.package.findUnique({ where: { id } });

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
    const { id } = packageParamsSchema.parse(request.params);

    const pkg = await prisma.package.findUnique({ where: { id } });

    if (!pkg) {
      throw new AppError("Package not found", 404);
    }

    await prisma.$transaction([
      prisma.retrievalLog.deleteMany({ where: { packageId: id } }),
      prisma.package.delete({ where: { id } }),
    ]);

    return response.status(204).json();
  }
}

export { PackagesController };
