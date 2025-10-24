import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import { visitorExitSchema, visitorParamsSchema, visitorRegisterSchema } from "@/validators/visitor-schemas";
import { Request, Response } from "express";

class VisitorsController {
  async register(request: Request, response: Response) {
    const { name, document, phone, visitReason, hostId } = visitorRegisterSchema.parse(request.body);

    const visitor = await prisma.visitor.upsert({
      where: { document },
      update: { name, phone: phone ?? null, visitReason: visitReason ?? null },
      create: { name, document, phone: phone ?? null, visitReason: visitReason ?? null },
    });

    const log = await prisma.visitLog.create({
      data: {
        visitorId: visitor.id,
        hostId,
        handledById: request.user!.id,
        notes: visitReason ?? null,
      },
      include: {
        visitor: true,
        host: true,
        handledBy: true,
      },
    });

    return response.status(201).json(log);
  }

  async list(_: Request, response: Response) {
    const logs = await prisma.visitLog.findMany({
    include: {
      visitor: true,
      host: { select: { name: true, apartment: true } },
      handledBy: { select: { name: true } },
    },
    orderBy: { entryTime: "desc" },
    take: 100,
  });

  return response.json(logs);
  }

  async exit(request: Request, response: Response) {
    const { id } = visitorParamsSchema.parse(request.params);

    if(!id) {
      throw new AppError("Must provide id", 400);
    }

    const parsed = visitorExitSchema.parse(request.body);

    const log = await prisma.visitLog.update({
      where: { id },
      data: {
        exitTime: new Date(),
        notes: parsed.notes ?? null,
      },
      include: {
        visitor: true,
        host: true,
        handledBy: true,
      }
    });

    return response.json(log);
  }
}

export { VisitorsController };