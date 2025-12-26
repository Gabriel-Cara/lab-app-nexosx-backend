import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import { buildSlotsFromSchedule } from "@/utils/area-slots";
import { combineDateWithTime, normalizeDate } from "@/utils/datetime";
import {
  areaParamsSchema,
  areaSlotsQuerySchema,
  areaSlotsRangeQuerySchema,
  createAreaSchema,
  updateAreaSchema,
} from "@/validators/areas-schemas";
import { Request, Response } from "express";

class AreasController {
  async index(request: Request, response: Response) {
    const { id } = areaParamsSchema.parse(request.params);

    const areas = await prisma.commonArea.findUnique({
      where: { id },
      include: {
        timeSlots: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }],
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            sortOrder: true,
          },
        },
      },
    });

    return response.json(areas);
  }

  async create(request: Request, response: Response) {
    const { name, schedule, ...data } = createAreaSchema.parse(request.body);

    const existing = await prisma.commonArea.findFirst({ where: { name } });

    if (existing) {
      throw new AppError("Area already exists", 400);
    }

    const area = await prisma.$transaction(async (tx) => {
      const createdArea = await tx.commonArea.create({
        data: {
          name,
          ...data,
        },
      });

      if (schedule) {
        const slots = buildSlotsFromSchedule(schedule);

        if (slots.length > 0) {
          await tx.areaTimeSlot.createMany({
            data: slots.map((slot) => ({
              ...slot,
              areaId: createdArea.id,
            })),
          });
        }
      }

      return createdArea;
    });

    return response.status(201).json(area);
  }

  async list(_: Request, response: Response) {
    const areas = await prisma.commonArea.findMany({
      orderBy: { name: "asc" },
      include: {
        timeSlots: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }],
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            sortOrder: true,
          },
        },
      },
    });

    return response.json(areas);
  }

  async update(request: Request, response: Response) {
    const { id } = areaParamsSchema.parse(request.params);
    const { schedule, ...data } = updateAreaSchema.parse(request.body);

    const area = await prisma.commonArea.findUnique({ where: { id } });

    if (!area) {
      throw new AppError("Area not found", 404);
    }

    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    const updated = await prisma.$transaction(async (tx) => {
      let updatedArea = area;

      if (Object.keys(updateData).length > 0) {
        updatedArea = await tx.commonArea.update({
          where: { id },
          data: updateData,
        });
      }

      if (schedule) {
        const slots = buildSlotsFromSchedule(schedule);

        await tx.areaTimeSlot.updateMany({
          where: { areaId: id },
          data: { isActive: false },
        });

        for (const slot of slots) {
          await tx.areaTimeSlot.upsert({
            where: {
              areaId_startsAt_endsAt: {
                areaId: id,
                startsAt: slot.startsAt,
                endsAt: slot.endsAt,
              },
            },
            update: {
              label: slot.label,
              sortOrder: slot.sortOrder,
              isActive: true,
            },
            create: {
              ...slot,
              areaId: id,
              isActive: true,
            },
          });
        }
      }

      return updatedArea;
    });

    return response.json({ id: updated.id, ...updateData });
  }

  async delete(request: Request, response: Response) {
    const { id } = areaParamsSchema.parse(request.params);

    const area = await prisma.commonArea.findUnique({ where: { id } });

    if (!area) {
      throw new AppError("Area not found", 404);
    }

    const events = await prisma.event.findMany({
      where: { commonAreaId: id },
      select: { id: true },
    });
    const eventIds = events.map((event) => event.id);

    await prisma.$transaction([
      prisma.eventLike.deleteMany({ where: { eventId: { in: eventIds } } }),
      prisma.eventBooking.deleteMany({ where: { eventId: { in: eventIds } } }),
      prisma.event.deleteMany({ where: { id: { in: eventIds } } }),
      prisma.commonArea.delete({ where: { id } }),
    ]);

    return response.status(204).json();
  }

  async slotsRange(request: Request, response: Response) {
    const { id } = areaParamsSchema.parse(request.params);
    const { start, end } = areaSlotsRangeQuerySchema.parse(request.query);

    const startDate = normalizeDate(start);
    const endDate = normalizeDate(end ?? start);

    if (endDate < startDate) {
      throw new AppError("End date must be after start date", 400);
    }

    const totalDays =
      Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    const area = await prisma.commonArea.findUnique({
      where: { id },
      include: {
        timeSlots: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }],
        },
      },
    });

    if (!area) {
      throw new AppError("Area not found", 404);
    }

    const rangeEnd = new Date(endDate);
    rangeEnd.setDate(rangeEnd.getDate() + 1);

    const reservations = await prisma.areaReservation.findMany({
      where: {
        areaId: id,
        date: {
          gte: startDate,
          lt: rangeEnd,
        },
        status: { in: ["pending", "approved"] },
      },
      select: {
        date: true,
        startTime: true,
        endTime: true,
      },
    });

    const reservationsByDay = new Map<number, typeof reservations>();
    for (const reservation of reservations) {
      const dayKey = new Date(reservation.date);
      dayKey.setHours(0, 0, 0, 0);
      const key = dayKey.getTime();
      const list = reservationsByDay.get(key);
      if (list) {
        list.push(reservation);
      } else {
        reservationsByDay.set(key, [reservation]);
      }
    }

    const days = Array.from({ length: totalDays }).map((_, index) => {
      const dayStart = new Date(startDate);
      dayStart.setDate(dayStart.getDate() + index);

      const dayReservations = reservationsByDay.get(dayStart.getTime()) ?? [];

      const slots = area.timeSlots.map((slot) => {
        const slotStart = combineDateWithTime(dayStart, slot.startsAt);
        const slotEnd = combineDateWithTime(dayStart, slot.endsAt);

        const isAvailable = !dayReservations.some(
          (reservation) =>
            slotStart < reservation.endTime && slotEnd > reservation.startTime
        );

        return {
          id: slot.id,
          label: slot.label,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          available: isAvailable,
          sortOrder: slot.sortOrder,
        };
      });

      const fullyBooked =
        slots.length > 0 && slots.every((slot) => slot.available === false);

      return {
        date: dayStart.toISOString(),
        slots,
        fullyBooked,
      };
    });

    const fullyBookedDates = days
      .filter((day) => day.fullyBooked)
      .map((day) => day.date);

    return response.json({
      areaId: id,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days,
      fullyBookedDates,
    });
  }

  async slots(request: Request, response: Response) {
    const { id } = areaParamsSchema.parse(request.params);
    const { date } = areaSlotsQuerySchema.parse(request.query);

    const targetDate = normalizeDate(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const area = await prisma.commonArea.findUnique({
      where: { id },
      include: {
        timeSlots: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }],
        },
      },
    });

    if (!area) {
      throw new AppError("Area not found", 404);
    }

    const reservations = await prisma.areaReservation.findMany({
      where: {
        areaId: id,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
        status: { in: ["pending", "approved"] },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const slots = area.timeSlots.map((slot) => {
      const slotStart = combineDateWithTime(targetDate, slot.startsAt);
      const slotEnd = combineDateWithTime(targetDate, slot.endsAt);

      const isAvailable = !reservations.some(
        (reservation) =>
          slotStart < reservation.endTime && slotEnd > reservation.startTime
      );

      return {
        id: slot.id,
        label: slot.label,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        available: isAvailable,
        sortOrder: slot.sortOrder,
      };
    });

    return response.json({
      date: targetDate.toISOString(),
      slots,
    });
  }
}

export { AreasController };
