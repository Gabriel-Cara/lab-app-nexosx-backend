import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import { visitorParamsSchema, visitorRegisterSchema } from "@/validators/visitor-schemas";
import { requireCondominiumId } from "@/utils/condominium";
import { Request, Response } from "express";

class VisitorsController {
  async register(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { name, document, phone, visitReason, hostId } = visitorRegisterSchema.parse(request.body);

    const host = await prisma.user.findFirst({
      where: { id: hostId, condominiumId },
      select: { id: true },
    });

    if (!host) {
      throw new AppError("Host not found", 404);
    }

    const visitor = await prisma.visitor.upsert({
      where: {
        condominiumId_document: {
          condominiumId,
          document,
        },
      },
      update: {
        name,
        phone: phone ?? null,
        visitReason: visitReason ?? null,
        status: "pending",
      },
      create: {
        name,
        document,
        phone: phone ?? null,
        visitReason: visitReason ?? null,
        status: "pending",
        condominiumId,
      },
    });

    const log = await prisma.visitLog.create({
      data: {
        visitorId: visitor.id,
        hostId,
        handledById: request.user!.id,
        status: "pending",
        condominiumId,
      },
      include: {
        visitor: true,
        host: true,
        handledBy: true,
      },
    });

    return response.status(201).json(log);
  }

  async list(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const logs = await prisma.visitLog.findMany({
      where: { condominiumId },
      include: {
        visitor: true,
        host: { select: { name: true, apartment: true } },
        handledBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return response.json(logs);
  }

  async entry(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = visitorParamsSchema.parse(request.params);

    if(!id) {
      throw new AppError("Must provide id", 400);
    }

    const visitorExists = await prisma.visitor.findFirst({
      where: { id, condominiumId },
    });

    // Confere se visitante existe
    if(!visitorExists) {
      throw new AppError("Visitor not found", 404);
    }

    const logPendingEntry = await prisma.visitLog.findFirst({
      where: {
        visitorId: id,
        entryTime: null,
        condominiumId,
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
        status: "entry",
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
    const condominiumId = requireCondominiumId(request);
    const { id } = visitorParamsSchema.parse(request.params);

    if(!id) {
      throw new AppError("Must provide id", 400);
    }

    const visitorExists = await prisma.visitor.findFirst({
      where: { id, condominiumId },
    });

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
        condominiumId,
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
        status: "left",
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
    const condominiumId = requireCondominiumId(request);
    const { id: visitorId } = visitorParamsSchema.parse(request.params);

    if(!visitorId) {
      throw new AppError("Must provide id", 400);
    }

    const log = await prisma.visitLog.findFirst({
      where: { visitorId, status: "pending", condominiumId },
      orderBy: { createdAt: "desc" },
      include: {
        visitor: true,
        host: true,
        handledBy: true,
      },
    });

    if (!log) {
      throw new AppError("Visitor does not have a pending visit to approve", 400);
    }

    const updatedLog = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.visitLog.updateMany({
        where: { id: log.id, status: "pending", condominiumId },
        data: { status: "authorized" },
      });

      if (updateResult.count === 0) {
        throw new AppError("Visitor does not have a pending visit to approve", 400);
      }

      await tx.visitor.update({
        where: { id: visitorId },
        data: { status: "authorized" },
      });

      return tx.visitLog.findUnique({
        where: { id: log.id },
        include: {
          visitor: true,
          host: true,
          handledBy: true,
        },
      });
    });

    if (!updatedLog) {
      throw new AppError("Visitor does not have a pending visit to approve", 400);
    }

    return response.json(updatedLog);
  }

  async reject(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id: visitorId } = visitorParamsSchema.parse(request.params);

    if(!visitorId) {
      throw new AppError("Must provide id", 400);
    }

    const log = await prisma.visitLog.findFirst({
      where: { visitorId, status: "pending", condominiumId },
      orderBy: { createdAt: "desc" },
      include: {
        visitor: true,
        host: true,
        handledBy: true,
      },
    });

    if (!log) {
      throw new AppError("Visitor does not have a pending visit to reject", 400);
    }

    const updatedLog = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.visitLog.updateMany({
        where: { id: log.id, status: "pending", condominiumId },
        data: { status: "denied" },
      });

      if (updateResult.count === 0) {
        throw new AppError("Visitor does not have a pending visit to reject", 400);
      }

      await tx.visitor.update({
        where: { id: visitorId },
        data: { status: "denied" },
      });

      return tx.visitLog.findUnique({
        where: { id: log.id },
        include: {
          visitor: true,
          host: true,
          handledBy: true,
        },
      });
    });

    if (!updatedLog) {
      throw new AppError("Visitor does not have a pending visit to reject", 400);
    }

    return response.json(updatedLog);
  }
}

export { VisitorsController };
