import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import { areaParamsSchema, createAreaSchema, updateAreaSchema } from "@/validators/areas-schemas";
import { Request, Response } from "express";

class AreasController {
  async create(request: Request, response: Response) {
    const { name, ...data } = createAreaSchema.parse(request.body);

    const existing = await prisma.commonArea.findFirst({ where: { name } });

    if (existing) {
      throw new AppError("Area already exists", 400);
    }

    const area = await prisma.commonArea.create({
      data: {
        name,
        ...data
      },
    });

    return response.status(201).json(area);
  }

  async list(_: Request, response: Response) {
    const areas = await prisma.commonArea.findMany({
      orderBy: { name: "asc" },
    });

    return response.json(areas);
  }

  async update(request: Request, response: Response) {
    const { id } = areaParamsSchema.parse(request.params);

    const data = updateAreaSchema.parse(request.body);

    const area = await prisma.commonArea.findUnique({ where: { id } });

    if (!area) {
      throw new AppError("Area not found", 404);
    }

    const updated = await prisma.commonArea.update({
      where: { id },
      data,
    });

    return response.json({
      id: updated.id,
      ...data,
    })
  }

  async delete(request: Request, response: Response) {
    const { id } = areaParamsSchema.parse(request.params);

    const area = await prisma.commonArea.findUnique({ where: { id } });

    if (!area) {
      throw new AppError("Area not found", 404);
    }

    await prisma.commonArea.delete({ where: { id } });

    return response.status(204).json();
  }
}

export { AreasController };
