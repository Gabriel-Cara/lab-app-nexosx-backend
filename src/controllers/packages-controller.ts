import { prisma } from "@/database/prisma";
import { notifyResident } from "@/services/notification-service";
import { AppError } from "@/utils/app-error";
import { generateCode } from "@/utils/generate-code";
import {
  packageCreateSchema,
  packageParamsSchema,
  packageRetrieveSchema,
} from "@/validators/package-schemas";
import { Request, Response } from "express";

class PackagesController {
  async create(request: Request, response: Response) {
    const { residentId, description, carrier, type } =
      packageCreateSchema.parse(request.body);

    const code = generateCode(6);

    const pkg = await prisma.package.create({
      data: {
        code,
        residentId,
        description,
        carrier: carrier ?? null,
        type,
        status: "pending",
        createdById: request.user!.id,
      },
      include: {
        resident: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    if (pkg.resident.phone) {
      await notifyResident({
        phone: pkg.resident.phone,
        message: `Olá ${pkg.resident.name}, sua encomenda chegou! Código: ${code}`,
      });
    }

    return response.status(201).json(pkg);
  }

  async list(request: Request, response: Response) {
    const { role, id } = request.user!;

    const where = role === "resident" ? { residentId: id } : undefined;

    const packages = await prisma.package.findMany({
      ...(where ? { where } : {}),
      include: {
        resident: { select: { name: true, apartment: true, phone: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { receivedAt: "desc" },
    });

    return response.json(packages);
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

    if (parsed.code !== pkg.code) {
      throw new AppError("Invalid code", 400);
    }

    const updated = await prisma.package.update({
      where: { id },
      data: {
        retrievedAt: new Date(),
        status: "retrieved",
        retrievalLogs: {
          create: {
            verifiedById: request.user!.id,
            method: "codigo",
          },
        },
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
    });

    return response.json({ updated });
  }
}

export { PackagesController };
