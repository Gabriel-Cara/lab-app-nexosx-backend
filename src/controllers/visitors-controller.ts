import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import { visitorParamsSchema, visitorRegisterSchema } from "@/validators/visitor-schemas";
import { Request, Response } from "express";

class VisitorsController {
  async register(request: Request, response: Response) {
    const { name, document, phone, visitReason, hostId } = visitorRegisterSchema.parse(request.body);

    const visitor = await prisma.visitor.upsert({
      where: { document },
      update: { name, phone: phone ?? null, visitReason: visitReason ?? null, status: "pending" },
      create: { name, document, phone: phone ?? null, visitReason: visitReason ?? null, status: "pending" },
    });

    const log = await prisma.visitLog.create({
      data: {
        visitorId: visitor.id,
        hostId,
        handledById: request.user!.id,
        status: "pending",
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
    orderBy: { createdAt: "desc" },
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
    const { id: visitorId } = visitorParamsSchema.parse(request.params);

    if(!visitorId) {
      throw new AppError("Must provide id", 400);
    }

    const log = await prisma.visitLog.findFirst({
      where: { visitorId, status: "pending" },
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

    const updatedLog = await prisma.visitLog.update({
      where: { id: log.id },
      data: { status: "authorized" },
      include: {
        visitor: true,
        host: true,
        handledBy: true,
      },
    });

    await prisma.visitor.update({
      where: { id: visitorId },
      data: { status: "authorized" },
    });

    return response.json(updatedLog);
  }

  async reject(request: Request, response: Response) {
    const { id: visitorId } = visitorParamsSchema.parse(request.params);

    if(!visitorId) {
      throw new AppError("Must provide id", 400);
    }

    const log = await prisma.visitLog.findFirst({
      where: { visitorId, status: "pending" },
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

    const updatedLog = await prisma.visitLog.update({
      where: { id: log.id },
      data: { status: "denied" },
      include: {
        visitor: true,
        host: true,
        handledBy: true,
      },
    });

    await prisma.visitor.update({
      where: { id: visitorId },
      data: { status: "denied" },
    });

    return response.json(updatedLog);
  }
}

export { VisitorsController };
