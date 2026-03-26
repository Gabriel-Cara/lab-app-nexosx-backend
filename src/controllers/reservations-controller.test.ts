import type { Request, Response } from "express";

import { prisma } from "@/database/prisma";
import { ReservationsController } from "@/controllers/reservations-controller";

jest.mock("@/database/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    areaTimeSlot: {
      findMany: jest.fn(),
    },
    areaReservation: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

function createResponse() {
  const response = {} as Response;

  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);

  return response;
}

function createRequest(date: string) {
  return {
    body: {
      areaId: "11111111-1111-4111-8111-111111111111",
      date,
      startSlotId: "22222222-2222-4222-8222-222222222222",
      endSlotId: "33333333-3333-4333-8333-333333333333",
      purpose: "Churrasco em familia",
    },
    user: {
      id: "44444444-4444-4444-8444-444444444444",
      role: "resident",
      condominiumId: "55555555-5555-4555-8555-555555555555",
    },
  } as unknown as Request;
}

describe("ReservationsController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-03-26T12:00:00.000Z"));

    prisma.$transaction = jest
      .fn()
      .mockImplementation(async (callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ) as typeof prisma.$transaction;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("rejects reservation dates beyond 1 month from today", async () => {
    const controller = new ReservationsController();

    await expect(
      controller.create(
        createRequest("2026-04-27T12:00:00.000Z"),
        createResponse(),
      ),
    ).rejects.toMatchObject({
      message: "Reservations are only available within 1 month from today",
      statusCode: 400,
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects reservation dates in the past", async () => {
    const controller = new ReservationsController();

    await expect(
      controller.create(
        createRequest("2026-03-10T12:00:00.000Z"),
        createResponse(),
      ),
    ).rejects.toMatchObject({
      message: "Reservations cannot be created for past dates",
      statusCode: 400,
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("allows reservation dates on the same day next month", async () => {
    const controller = new ReservationsController();
    const response = createResponse();

    prisma.areaTimeSlot.findMany = jest.fn().mockResolvedValue([
      {
        id: "22222222-2222-4222-8222-222222222222",
        areaId: "11111111-1111-4111-8111-111111111111",
        isActive: true,
        startsAt: "10:00",
        endsAt: "10:30",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        areaId: "11111111-1111-4111-8111-111111111111",
        isActive: true,
        startsAt: "10:30",
        endsAt: "11:00",
      },
    ]);
    prisma.areaReservation.findFirst = jest.fn().mockResolvedValue(null);
    prisma.areaReservation.create = jest
      .fn()
      .mockResolvedValue({ id: "reservation-1" });

    await controller.create(
      createRequest("2026-04-26T12:00:00.000Z"),
      response,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.areaReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          areaId: "11111111-1111-4111-8111-111111111111",
          residentId: "44444444-4444-4444-8444-444444444444",
          condominiumId: "55555555-5555-4555-8555-555555555555",
          date: expect.any(Date),
        }),
      }),
    );
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({ id: "reservation-1" });
  });
});
