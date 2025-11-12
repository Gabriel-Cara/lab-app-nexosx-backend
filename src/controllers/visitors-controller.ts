import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import { visitorActionSchema, visitorParamsSchema, visitorRegisterSchema } from "@/validators/visitor-schemas";
import { Request, Response } from "express";

class VisitorsController {
  async register(request: Request, response: Response) {
    const { name, document, phone, visitReason, hostId } = visitorRegisterSchema.parse(request.body);

    const visitor = await prisma.visitor.upsert({
      where: { document },
      update: { name, phone: phone ?? null, visitReason: visitReason ?? null, status: "pending" },
      create: { name, document, phone: phone ?? null, visitReason: visitReason ?? null, status: "pending"  },
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

  async entry(request: Request, response: Response) {
    const { id } = visitorParamsSchema.parse(request.params);

    if(!id) {
      throw new AppError("Must provide id", 400);
    }

    const visitorExists = await prisma.visitor.findUnique({ where: { id } });

    // Confere se visitante existe
    if(!visitorExists) {
      throw new AppError("Visitor not found", 404);
    }

    const logPendingEntry = await prisma.visitLog.findFirst({
      where: {
        visitorId: id,
        entryTime: null,
      },
      select: { id: true },
    });

    if (!logPendingEntry) {
      throw new AppError("Visitor does not have a pending entry log", 400);
    }

    const log = await prisma.visitLog.update({
      where: { id: logPendingEntry.id },
      data: {
        entryTime: new Date(),
        visitor: {
          update: {
            status: "entry"
          }
        }
      },
      include: {
        visitor: true,
        host: true,
        handledBy: true,
      }
    });

    return response.json(log);
  }

  async exit(request: Request, response: Response) {
    const { id } = visitorParamsSchema.parse(request.params);

    if(!id) {
      throw new AppError("Must provide id", 400);
    }

    const visitorExists = await prisma.visitor.findUnique({ where: { id } });

    // Confere se visitante existe
    if(!visitorExists) {
      throw new AppError("Visitor not found", 404);
    }
    
    const logPendingExit = await prisma.visitLog.findFirst({
      where: {
        visitorId: id,
        entryTime: {
          not: null,
        },
        exitTime: null,
      },
      select: { id: true },
    });

    if (!logPendingExit) {
      throw new AppError("Visitor does not have an open entry to exit", 400);
    }

    const log = await prisma.visitLog.update({
      where: { id: logPendingExit.id },
      data: {
        exitTime: new Date(),
        visitor: {
          update: {
            status: "left"
          }
        }
      },
      include: {
        visitor: true,
        host: true,
        handledBy: true,
      }
    });

    return response.json(log);
  }

  async approve(request: Request, response: Response) {
    const { id: visitorId } = visitorParamsSchema.parse(request.params);

    if(!visitorId) {
      throw new AppError("Must provide id", 400);
    }

    const visitor = await prisma.visitor.findUnique({ where: { id: visitorId } });

    if(!visitor) {
      throw new AppError("Visitor not found", 404);
    }

    // Confere se visitante já foi autorizado
    if(visitor.status === "authorized") {
      throw new AppError("Visitor is already authorized", 400);
    } else if (visitor.status === "denied") {
      throw new AppError("Visitor is already denied", 400);
    }

    const logId = await prisma.visitLog.findFirst({ where: { visitorId }, select: { id: true } });

    const log = await prisma.visitLog.update({
      where: { id: logId!.id },
      data: {
        visitor: {
          update: {
            status: "authorized"
          }
        }
      },
      include: {
        visitor: true,
        host: true,
        handledBy: true,
      }
    });

    return response.json(log);
  }

  async reject(request: Request, response: Response) {
    const { id: visitorId } = visitorParamsSchema.parse(request.params);

    if(!visitorId) {
      throw new AppError("Must provide id", 400);
    }

    const visitor = await prisma.visitor.findUnique({ where: { id: visitorId } });

    if(!visitor) {
      throw new AppError("Visitor not found", 404);
    }

    // Confere se visitante já foi autorizado
    if(visitor.status === "authorized") {
      throw new AppError("Visitor is already authorized", 400);
    } else if (visitor.status === "denied") {
      throw new AppError("Visitor is already denied", 400);
    }

    const logId = await prisma.visitLog.findFirst({ where: { visitorId }, select: { id: true } });

    const log = await prisma.visitLog.update({
      where: { id: logId!.id },
      data: {
        visitor: {
          update: {
            status: "denied"
          }
        }
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
