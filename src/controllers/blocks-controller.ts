import { Request, Response } from "express";

import { prisma } from "@/database/prisma";
import { requireCondominiumId } from "@/utils/condominium";
import { AppError } from "@/utils/app-error";
import {
  blockCreateSchema,
  blockParamsSchema,
  blockUpdateSchema,
} from "@/validators/blocks-schemas";

class BlocksController {
  async list(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);

    const blocks = await prisma.block.findMany({
      where: { condominiumId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { residences: true },
        },
      },
    });

    return response.json(blocks);
  }

  async create(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { name } = blockCreateSchema.parse(request.body);

    const existing = await prisma.block.findUnique({
      where: {
        condominiumId_name: {
          condominiumId,
          name,
        },
      },
    });

    if (existing) {
      throw new AppError("Block already exists", 400);
    }

    const block = await prisma.block.create({
      data: { name, condominiumId },
      include: {
        _count: {
          select: { residences: true },
        },
      },
    });

    return response.status(201).json(block);
  }

  async update(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = blockParamsSchema.parse(request.params);
    const data = blockUpdateSchema.parse(request.body);

    const block = await prisma.block.findFirst({
      where: { id, condominiumId },
    });

    if (!block) {
      throw new AppError("Block not found", 404);
    }

    if (data.name && data.name !== block.name) {
      const nameInUse = await prisma.block.findUnique({
        where: {
          condominiumId_name: {
            condominiumId,
            name: data.name,
          },
        },
        select: { id: true },
      });

      if (nameInUse && nameInUse.id !== id) {
        throw new AppError("Block already exists", 400);
      }
    }

    const updated = await prisma.block.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { residences: true },
        },
      },
    });

    return response.json(updated);
  }

  async delete(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = blockParamsSchema.parse(request.params);

    const block = await prisma.block.findFirst({
      where: { id, condominiumId },
      select: { id: true },
    });

    if (!block) {
      throw new AppError("Block not found", 404);
    }

    await prisma.block.delete({ where: { id } });

    return response.status(204).send();
  }
}

export { BlocksController };
