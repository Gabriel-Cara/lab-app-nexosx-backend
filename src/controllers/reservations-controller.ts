import { Request, Response } from "express";

import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import { Prisma } from "@prisma/client";
import {
  actionSchema,
  createReservationSchema,
  reservationQuerySchema,
} from "@/validators/reservations-schemas";
import {
  combineDateWithTime,
  minutesFromTime,
  normalizeDate,
} from "@/utils/datetime";
import { requireCondominiumId } from "@/utils/condominium";

function getTodayStart(reference = new Date()) {
  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);
  return today;
}

function getReservationWindowEnd(reference = new Date()) {
  const today = getTodayStart(reference);
  const nextMonth = today.getMonth() + 1;
  const lastDayOfNextMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 2,
    0,
  ).getDate();
  const targetDay = Math.min(today.getDate(), lastDayOfNextMonth);

  return new Date(today.getFullYear(), nextMonth, targetDay);
}

function assertReservationDateAllowed(reservationDate: Date, referenceDate = new Date()) {
  const todayStart = getTodayStart(referenceDate);

  if (reservationDate < todayStart) {
    throw new AppError("Reservations cannot be created for past dates", 400);
  }

  const reservationWindowEnd = getReservationWindowEnd(referenceDate);

  if (reservationDate > reservationWindowEnd) {
    throw new AppError(
      "Reservations are only available within 1 month from today",
      400,
    );
  }
}

class ReservationsController {
  async create(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { areaId, date, startSlotId, endSlotId, purpose } =
      createReservationSchema.parse(request.body);

    const reservationDate = normalizeDate(date);
    assertReservationDateAllowed(reservationDate);
    const residentId = request.user!.id;

    try {
      const created = await prisma.$transaction(
        async (tx) => {
          const slots = await tx.areaTimeSlot.findMany({
            where: { id: { in: [startSlotId, endSlotId] }, condominiumId },
          });

          const startSlot = slots.find((slot) => slot.id === startSlotId);
          const endSlot = slots.find((slot) => slot.id === endSlotId);

          if (!startSlot || startSlot.areaId !== areaId || !startSlot.isActive) {
            throw new AppError("Invalid start slot for this area", 400);
          }

          if (!endSlot || endSlot.areaId !== areaId || !endSlot.isActive) {
            throw new AppError("Invalid end slot for this area", 400);
          }

          const startMinutes = minutesFromTime(startSlot.startsAt);
          const endMinutes = minutesFromTime(endSlot.endsAt);

          if (endMinutes <= startMinutes) {
            throw new AppError("End time must be after start time", 400);
          }

          const startTime = combineDateWithTime(reservationDate, startSlot.startsAt);
          const endTime = combineDateWithTime(reservationDate, endSlot.endsAt);

          const conflict = await tx.areaReservation.findFirst({
            where: {
              areaId: areaId,
              date: reservationDate,
              condominiumId,
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

          return tx.areaReservation.create({
            data: {
              areaId,
              residentId,
              date: reservationDate,
              startTime,
              endTime,
              startSlotId,
              endSlotId,
              purpose,
              condominiumId,
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
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      return response.status(201).json(created);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2034") {
          throw new AppError("Conflict detected, please try another time", 409);
        }
      }

      throw error;
    }
  }

  async list(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { areaId, status, startDate, endDate } =
      reservationQuerySchema.parse(request.query);

    let start: Date | undefined
    let end: Date | undefined

    if (startDate) {
      start = new Date(startDate)
      if (Number.isNaN(start.getTime())) {
        throw new AppError("Invalid start date", 400)
      }
      start.setHours(0, 0, 0, 0)
    }

    if (endDate) {
      end = new Date(endDate)
      if (Number.isNaN(end.getTime())) {
        throw new AppError("Invalid end date", 400)
      }
      end.setHours(23, 59, 59, 999)
    }

    if (start && end && end < start) {
      throw new AppError("End date must be after start date", 400)
    }

    const where = {
      condominiumId,
      ...(areaId ? { areaId } : {}),
      ...(status ? { status } : {}),
      ...(start || end
        ? {
            date: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {}),
            },
          }
        : {}),
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
    const condominiumId = requireCondominiumId(request);
    const { id } = actionSchema.parse(request.params);

    const reservation = await prisma.areaReservation.findFirst({
      where: { id, condominiumId },
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
    const condominiumId = requireCondominiumId(request);
    const { id } = actionSchema.parse(request.params);

    const reservation = await prisma.areaReservation.findFirst({
      where: { id, condominiumId },
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
    const condominiumId = requireCondominiumId(request);
    const { id } = actionSchema.parse(request.params);

    const reservation = await prisma.areaReservation.findFirst({
      where: { id, condominiumId },
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
