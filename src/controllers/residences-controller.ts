import { Request, Response } from "express";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/database/prisma";
import { requireCondominiumId } from "@/utils/condominium";
import { AppError } from "@/utils/app-error";
import {
  residenceCreateSchema,
  residenceParamsSchema,
  residenceQuerySchema,
  residenceUpdateSchema,
} from "@/validators/residences-schemas";

const residenceInclude = {
  block: {
    select: {
      id: true,
      name: true,
    },
  },
  residents: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      imageUrl: true,
      role: true,
    },
    orderBy: { name: "asc" as const },
  },
};

class ResidencesController {
  async list(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { blockId, search } = residenceQuerySchema.parse(request.query);
    const user = request.user;

    if (user?.role === "resident") {
      const currentUser = await prisma.user.findFirst({
        where: { id: user.id, condominiumId },
        select: { residenceId: true },
      });

      if (!currentUser?.residenceId) {
        return response.json([]);
      }

      const residence = await prisma.residence.findFirst({
        where: { id: currentUser.residenceId, condominiumId },
        include: residenceInclude,
      });

      return response.json(residence ? [residence] : []);
    }

    const where: Prisma.ResidenceWhereInput = {
      condominiumId,
      blockId,
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: "insensitive" } },
              { block: { name: { contains: search, mode: "insensitive" } } },
              {
                residents: {
                  some: { name: { contains: search, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
    };

    const residences = await prisma.residence.findMany({
      where,
      orderBy: [{ block: { name: "asc" } }, { number: "asc" }],
      include: residenceInclude,
    });

    return response.json(residences);
  }

  async index(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = residenceParamsSchema.parse(request.params);
    const user = request.user;

    const where: Prisma.ResidenceWhereInput = { id, condominiumId };

    if (user?.role === "resident") {
      where.residents = { some: { id: user.id } };
    }

    const residence = await prisma.residence.findFirst({
      where,
      include: residenceInclude,
    });

    if (!residence) {
      throw new AppError("Residence not found", 404);
    }

    return response.json(residence);
  }

  async create(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { number, blockId } = residenceCreateSchema.parse(request.body);

    const block = await prisma.block.findFirst({
      where: { id: blockId, condominiumId },
      select: { id: true },
    });

    if (!block) {
      throw new AppError("Block not found", 404);
    }

    const existing = await prisma.residence.findUnique({
      where: {
        blockId_number: {
          blockId,
          number,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new AppError("Residence already exists", 400);
    }

    const residence = await prisma.residence.create({
      data: { number, blockId, condominiumId },
      include: residenceInclude,
    });

    return response.status(201).json(residence);
  }

  async update(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = residenceParamsSchema.parse(request.params);
    const data = residenceUpdateSchema.parse(request.body);

    const residence = await prisma.residence.findFirst({
      where: { id, condominiumId },
      select: { id: true, blockId: true, number: true },
    });

    if (!residence) {
      throw new AppError("Residence not found", 404);
    }

    const nextBlockId = data.blockId ?? residence.blockId;
    const nextNumber = data.number ?? residence.number;

    if (data.blockId) {
      const block = await prisma.block.findFirst({
        where: { id: data.blockId, condominiumId },
        select: { id: true },
      });

      if (!block) {
        throw new AppError("Block not found", 404);
      }
    }

    if (nextBlockId !== residence.blockId || nextNumber !== residence.number) {
      const duplicated = await prisma.residence.findUnique({
        where: {
          blockId_number: {
            blockId: nextBlockId,
            number: nextNumber,
          },
        },
        select: { id: true },
      });

      if (duplicated && duplicated.id !== id) {
        throw new AppError("Residence already exists", 400);
      }
    }

    const updated = await prisma.residence.update({
      where: { id },
      data,
      include: residenceInclude,
    });

    await prisma.user.updateMany({
      where: { residenceId: id, condominiumId },
      data: { apartment: updated.number },
    });

    await prisma.residentInfo.updateMany({
      where: { condominiumId, user: { is: { residenceId: id } } },
      data: { building: updated.block.name },
    });

    return response.json(updated);
  }

  async delete(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = residenceParamsSchema.parse(request.params);

    const residence = await prisma.residence.findFirst({
      where: { id, condominiumId },
      select: { id: true },
    });

    if (!residence) {
      throw new AppError("Residence not found", 404);
    }

    await prisma.residence.delete({ where: { id } });

    return response.status(204).send();
  }
}

export { ResidencesController };
