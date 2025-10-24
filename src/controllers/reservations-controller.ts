import { Request, Response } from "express";

import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import {
  actionSchema,
  createReservationSchema,
  reservationQuerySchema,
} from "@/validators/reservations-schemas";

class ReservationsController {
  async create(request: Request, response: Response) {
    const { areaId, date, startTime, endTime, purpose } =
      createReservationSchema.parse(request.body);

    const conflict = await prisma.areaReservation.findFirst({
      where: {
        areaId: areaId,
        date: new Date(date),
        OR: [
          {
            startTime: { lt: new Date(endTime) },
            endTime: { gt: new Date(startTime) },
          },
        ],
        status: { in: ["pending", "approved"] },
      },
    });

    if (conflict) {
      throw new AppError("Conflict detected, please try another time", 409);
    }

    const created = await prisma.areaReservation.create({
      data: {
        areaId,
        residentId: request.user!.id,
        date,
        startTime,
        endTime,
        purpose: purpose ?? null,
      },
      include: {
        resident: {
          select: {
            name: true,
            apartment: true,
            phone: true,
          },
        },
      },
    });

    return response.status(201).json(created);
  }

  async list(request: Request, response: Response) {
    const { areaId, status } = reservationQuerySchema.parse(request.query);

    const where = {
      ...(areaId ? { areaId } : {}),
      ...(status ? { status } : {}),
    };

    const reservations = await prisma.areaReservation.findMany({
      where,
      include: {
        area: true,
        resident: { select: { name: true, apartment: true } },
      },
      orderBy: { date: "asc" },
    });

    return response.json({ reservations });
  }

  async approve(request: Request, response: Response) {
    const { id } = actionSchema.parse(request.params);

    const reservation = await prisma.areaReservation.findUnique({
      where: { id },
    });

    if(!reservation) {
      throw new AppError("Reservation not found", 404);
    }

    const updated = await prisma.areaReservation.update({
      where: { id },
      data: {
        status: "approved"
      }
    });

    return response.json(updated);
  }

  async reject(request: Request, response: Response) {
    const { id } = actionSchema.parse(request.params);

    const reservation = await prisma.areaReservation.findUnique({
      where: { id },
    });

    if(!reservation) {
      throw new AppError("Reservation not found", 404);
    }

    const updated = await prisma.areaReservation.update({
      where: { id },
      data: {
        status: "rejected"
      }
    });

    return response.json(updated);
  }

  async cancel(request: Request, response: Response) {
    const { id } = actionSchema.parse(request.params);

    const reservation = await prisma.areaReservation.findUnique({
      where: { id },
    });

    if(!reservation) {
      throw new AppError("Reservation not found", 404);
    }

    const updated = await prisma.areaReservation.update({
      where: { id },
      data: {
        status: "cancelled"
      }
    });

    return response.json(updated);
  }
}

export { ReservationsController };
