import type { Request, Response } from "express";

import { AppError } from "@/utils/app-error";
import { prisma } from "@/database/prisma";
import { VisitorsController } from "@/controllers/visitors-controller";

jest.mock("@/database/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    user: {
      findFirst: jest.fn(),
    },
    visitor: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    visitLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

function createResponse() {
  const response = {} as Response;

  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);

  return response;
}

describe("VisitorsController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction = jest
      .fn()
      .mockImplementation(async (callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ) as typeof prisma.$transaction;
  });

  it("rejects residents trying to register a visitor for another host", async () => {
    const controller = new VisitorsController();
    const request = {
      body: {
        name: "Visitante",
        document: "1234",
        allowedHours: 2,
        hostId: "55555555-5555-4555-8555-555555555555",
      },
      user: {
        id: "66666666-6666-4666-8666-666666666666",
        role: "resident",
        condominiumId: "77777777-7777-4777-8777-777777777777",
      },
    } as unknown as Request;

    await expect(controller.register(request, createResponse())).rejects.toMatchObject({
      message: "Unauthorized",
      statusCode: 403,
    });
  });

  it("scopes resident visitor listings to their own host id", async () => {
    const controller = new VisitorsController();
    const request = {
      user: {
        id: "66666666-6666-4666-8666-666666666666",
        role: "resident",
        condominiumId: "77777777-7777-4777-8777-777777777777",
      },
    } as unknown as Request;
    const response = createResponse();

    prisma.visitLog.findMany = jest.fn().mockResolvedValue([]);

    await controller.list(request, response);

    expect(prisma.visitLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          condominiumId: "77777777-7777-4777-8777-777777777777",
          hostId: "66666666-6666-4666-8666-666666666666",
        },
      }),
    );
    expect(response.json).toHaveBeenCalledWith([]);
  });

  it("registers unlimited-access visitors as authorized without pending approval", async () => {
    const controller = new VisitorsController();
    const request = {
      body: {
        name: "Visitante livre",
        document: "1234",
        unlimitedAccess: true,
        hostId: "11111111-1111-4111-8111-111111111111",
      },
      user: {
        id: "22222222-2222-4222-8222-222222222222",
        role: "manager",
        condominiumId: "33333333-3333-4333-8333-333333333333",
      },
    } as unknown as Request;
    const response = createResponse();

    prisma.user.findFirst = jest.fn().mockResolvedValue({ id: request.body.hostId });
    prisma.visitor.upsert = jest.fn().mockResolvedValue({ id: "visitor-1" });
    prisma.visitLog.create = jest.fn().mockResolvedValue({ id: "log-1" });

    await controller.register(request, response);

    expect(prisma.visitor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          unlimitedAccess: true,
          allowedHours: null,
          status: "authorized",
        }),
        create: expect.objectContaining({
          unlimitedAccess: true,
          allowedHours: null,
          status: "authorized",
        }),
      }),
    );
    expect(prisma.visitLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unlimitedAccess: true,
          allowedHours: null,
          status: "authorized",
        }),
      }),
    );
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it("stores allowed hours for timed visitors during registration", async () => {
    const controller = new VisitorsController();
    const request = {
      body: {
        name: "Visitante temporario",
        document: "1234",
        allowedHours: 6,
        hostId: "11111111-1111-4111-8111-111111111111",
      },
      user: {
        id: "22222222-2222-4222-8222-222222222222",
        role: "manager",
        condominiumId: "33333333-3333-4333-8333-333333333333",
      },
    } as unknown as Request;
    const response = createResponse();

    prisma.user.findFirst = jest.fn().mockResolvedValue({ id: request.body.hostId });
    prisma.visitor.upsert = jest.fn().mockResolvedValue({ id: "visitor-1" });
    prisma.visitLog.create = jest.fn().mockResolvedValue({ id: "log-1" });

    await controller.register(request, response);

    expect(prisma.visitor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          unlimitedAccess: false,
          allowedHours: 6,
          status: "pending",
        }),
      }),
    );
    expect(prisma.visitLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unlimitedAccess: false,
          allowedHours: 6,
          status: "pending",
        }),
      }),
    );
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it("requires an authorized visit before allowing regular visitor entry", async () => {
    const controller = new VisitorsController();
    const request = {
      params: { id: "11111111-1111-4111-8111-111111111111" },
      user: {
        id: "22222222-2222-4222-8222-222222222222",
        role: "doorman",
        condominiumId: "33333333-3333-4333-8333-333333333333",
      },
    } as unknown as Request;

    prisma.visitor.findFirst = jest
      .fn()
      .mockResolvedValue({
        id: request.params.id,
        unlimitedAccess: false,
        allowedHours: 4,
      });
    prisma.visitLog.findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(controller.entry(request, createResponse())).rejects.toMatchObject({
      message: "Visitor does not have an authorized visit to enter",
      statusCode: 400,
    });
  });

  it("sets an expected exit time when a timed visitor enters", async () => {
    const controller = new VisitorsController();
    const request = {
      params: { id: "11111111-1111-4111-8111-111111111111" },
      user: {
        id: "22222222-2222-4222-8222-222222222222",
        role: "doorman",
        condominiumId: "33333333-3333-4333-8333-333333333333",
      },
    } as unknown as Request;
    const response = createResponse();
    const updatedLog = { id: "log-1" };

    prisma.visitor.findFirst = jest.fn().mockResolvedValue({
      id: request.params.id,
      unlimitedAccess: false,
      allowedHours: 5,
    });
    prisma.visitor.update = jest.fn().mockResolvedValue({});
    prisma.visitLog.findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "log-1", allowedHours: 5 });
    prisma.visitLog.update = jest.fn().mockResolvedValue(updatedLog);

    await controller.entry(request, response);

    expect(prisma.visitLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "log-1" },
        data: expect.objectContaining({
          entryTime: expect.any(Date),
          expectedExitTime: expect.any(Date),
          status: "entry",
        }),
      }),
    );
    expect(response.json).toHaveBeenCalledWith(updatedLog);
  });

  it("creates a new unlimited-access log when re-entering after a previous exit", async () => {
    const controller = new VisitorsController();
    const request = {
      params: { id: "11111111-1111-4111-8111-111111111111" },
      user: {
        id: "22222222-2222-4222-8222-222222222222",
        role: "doorman",
        condominiumId: "33333333-3333-4333-8333-333333333333",
      },
    } as unknown as Request;
    const response = createResponse();
    const createdLog = { id: "log-2" };

    prisma.visitor.findFirst = jest
      .fn()
      .mockResolvedValue({
        id: request.params.id,
        unlimitedAccess: true,
        allowedHours: null,
      });
    prisma.visitor.update = jest.fn().mockResolvedValue({});
    prisma.visitLog.findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ hostId: "44444444-4444-4444-8444-444444444444" });
    prisma.visitLog.create = jest.fn().mockResolvedValue(createdLog);

    await controller.entry(request, response);

    expect(prisma.visitor.update).toHaveBeenCalledWith({
      where: { id: request.params.id },
      data: { status: "entry" },
    });
    expect(prisma.visitLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visitorId: request.params.id,
          hostId: "44444444-4444-4444-8444-444444444444",
          handledById: request.user?.id,
          unlimitedAccess: true,
          allowedHours: null,
          status: "entry",
          condominiumId: request.user?.condominiumId,
          entryTime: expect.any(Date),
          expectedExitTime: null,
        }),
      }),
    );
    expect(response.json).toHaveBeenCalledWith(createdLog);
  });
});
