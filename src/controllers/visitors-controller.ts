import { prisma } from "@/database/prisma";
import {
  getResidentVisitScope,
  resolveVisitHostId,
} from "@/services/visitors/visitor-access";
import {
  getExpectedExitTime,
  getInitialVisitStatus,
  normalizeAllowedHours,
} from "@/services/visitors/visitor-workflow";
import { AppError } from "@/utils/app-error";
import { visitorParamsSchema, visitorRegisterSchema } from "@/validators/visitor-schemas";
import { requireCondominiumId } from "@/utils/condominium";
import { Request, Response } from "express";

const visitLogInclude = {
  visitor: true,
  host: true,
  handledBy: true,
} as const;

class VisitorsController {
  async register(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { name, document, phone, visitReason, hostId, unlimitedAccess, allowedHours } =
      visitorRegisterSchema.parse(request.body);
    const user = request.user!;
    const effectiveHostId = resolveVisitHostId(user, hostId);
    const initialStatus = getInitialVisitStatus(unlimitedAccess);
    const normalizedAllowedHours = normalizeAllowedHours(
      unlimitedAccess,
      allowedHours,
    );

    const host = await prisma.user.findFirst({
      where: { id: effectiveHostId, condominiumId, role: "resident" },
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
        status: initialStatus,
        unlimitedAccess,
        allowedHours: normalizedAllowedHours,
      },
      create: {
        name,
        document,
        phone: phone ?? null,
        visitReason: visitReason ?? null,
        status: initialStatus,
        unlimitedAccess,
        allowedHours: normalizedAllowedHours,
        condominiumId,
      },
    });

    const log = await prisma.visitLog.create({
      data: {
        visitorId: visitor.id,
        hostId: effectiveHostId,
        handledById: user.id,
        status: initialStatus,
        unlimitedAccess,
        allowedHours: normalizedAllowedHours,
        condominiumId,
      },
      include: visitLogInclude,
    });

    return response.status(201).json(log);
  }

  async list(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const residentVisitScope = getResidentVisitScope(request.user!);
    const logs = await prisma.visitLog.findMany({
      where: { condominiumId, ...residentVisitScope },
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
    const user = request.user!;

    if(!id) {
      throw new AppError("Must provide id", 400);
    }

    const visitor = await prisma.visitor.findFirst({
      where: { id, condominiumId },
      select: { id: true, unlimitedAccess: true },
    });

    if(!visitor) {
      throw new AppError("Visitor not found", 404);
    }

    const openLog = await prisma.visitLog.findFirst({
      where: {
        visitorId: id,
        status: "entry",
        entryTime: {
          not: null,
        },
        exitTime: null,
        condominiumId,
      },
      select: { id: true },
    });

    if (openLog) {
      throw new AppError("Visitor already has an open entry", 400);
    }

    const log = visitor.unlimitedAccess
      ? await this.markUnlimitedEntry({
          condominiumId,
          userId: user.id,
          visitorId: id,
        })
      : await this.markAuthorizedEntry({
          condominiumId,
          visitorId: id,
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
      select: { id: true },
    });

    if(!visitorExists) {
      throw new AppError("Visitor not found", 404);
    }
    
    const logPendingExit = await prisma.visitLog.findFirst({
      where: {
        visitorId: id,
        status: "entry",
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

    const log = await prisma.$transaction(async (tx) => {
      await tx.visitor.update({
        where: { id },
        data: { status: "left" },
      });

      return tx.visitLog.update({
        where: { id: logPendingExit.id },
        data: {
          exitTime: new Date(),
          status: "left",
        },
        include: visitLogInclude,
      });
    });

    return response.json(log);
  }

  async approve(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id: visitorId } = visitorParamsSchema.parse(request.params);
    const residentVisitScope = getResidentVisitScope(request.user!);

    if(!visitorId) {
      throw new AppError("Must provide id", 400);
    }

    const log = await prisma.visitLog.findFirst({
      where: { visitorId, status: "pending", condominiumId, ...residentVisitScope },
      orderBy: { createdAt: "desc" },
      include: visitLogInclude,
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
        include: visitLogInclude,
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
    const residentVisitScope = getResidentVisitScope(request.user!);

    if(!visitorId) {
      throw new AppError("Must provide id", 400);
    }

    const log = await prisma.visitLog.findFirst({
      where: { visitorId, status: "pending", condominiumId, ...residentVisitScope },
      orderBy: { createdAt: "desc" },
      include: visitLogInclude,
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
        include: visitLogInclude,
      });
    });

    if (!updatedLog) {
      throw new AppError("Visitor does not have a pending visit to reject", 400);
    }

    return response.json(updatedLog);
  }

  private async markAuthorizedEntry(params: {
    condominiumId: string;
    visitorId: string;
  }) {
    const { condominiumId, visitorId } = params;
    const logPendingEntry = await prisma.visitLog.findFirst({
      where: {
        visitorId,
        status: "authorized",
        entryTime: null,
        condominiumId,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, allowedHours: true },
    });

    if (!logPendingEntry) {
      throw new AppError("Visitor does not have an authorized visit to enter", 400);
    }

    const entryTime = new Date();
    const expectedExitTime = getExpectedExitTime(
      logPendingEntry.allowedHours,
      entryTime,
    );

    return prisma.$transaction(async (tx) => {
      await tx.visitor.update({
        where: { id: visitorId },
        data: { status: "entry" },
      });

      return tx.visitLog.update({
        where: { id: logPendingEntry.id },
        data: {
          entryTime,
          expectedExitTime,
          status: "entry",
        },
        include: visitLogInclude,
      });
    });
  }

  private async markUnlimitedEntry(params: {
    condominiumId: string;
    userId: string;
    visitorId: string;
  }) {
    const { condominiumId, userId, visitorId } = params;
    const reusableAuthorizedLog = await prisma.visitLog.findFirst({
      where: {
        visitorId,
        status: "authorized",
        entryTime: null,
        unlimitedAccess: true,
        condominiumId,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    const entryTime = new Date();

    return prisma.$transaction(async (tx) => {
      await tx.visitor.update({
        where: { id: visitorId },
        data: { status: "entry" },
      });

      if (reusableAuthorizedLog) {
        return tx.visitLog.update({
          where: { id: reusableAuthorizedLog.id },
          data: {
            entryTime,
            expectedExitTime: null,
            status: "entry",
          },
          include: visitLogInclude,
        });
      }

      const latestLog = await tx.visitLog.findFirst({
        where: {
          visitorId,
          condominiumId,
        },
        orderBy: { createdAt: "desc" },
        select: { hostId: true },
      });

      if (!latestLog) {
        throw new AppError("Visitor does not have a host configured", 400);
      }

      return tx.visitLog.create({
        data: {
          visitorId,
          hostId: latestLog.hostId,
          handledById: userId,
          entryTime,
          expectedExitTime: null,
          status: "entry",
          unlimitedAccess: true,
          allowedHours: null,
          condominiumId,
        },
        include: visitLogInclude,
      });
    });
  }
}

export { VisitorsController };
