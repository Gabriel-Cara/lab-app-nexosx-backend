import { Request, Response } from "express";
import { hash } from "bcrypt";

import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import { condominiumCreateSchema } from "@/validators/condominium-schemas";

class CondominiumsController {
  async create(request: Request, response: Response) {
    const { name, code, admin } = condominiumCreateSchema.parse(request.body);

    const existing = await prisma.condominium.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existing) {
      throw new AppError("Condominium already exists", 400);
    }

    const passwordHash = await hash(admin.password, 8);

    const result = await prisma.$transaction(async (tx) => {
      const condominium = await tx.condominium.create({
        data: {
          name,
          code,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          name: admin.name,
          email: admin.email,
          phone: admin.phone ?? null,
          password: passwordHash,
          role: "manager",
          condominiumId: condominium.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      return { condominium, adminUser };
    });

    return response.status(201).json({
      condominium: {
        id: result.condominium.id,
        name: result.condominium.name,
        code: result.condominium.code,
        createdAt: result.condominium.createdAt,
      },
      admin: result.adminUser,
    });
  }

  async list(_: Request, response: Response) {
    const condominiums = await prisma.condominium.findMany({
      orderBy: { createdAt: "desc" },
    });

    return response.json(condominiums);
  }
}

export { CondominiumsController };
