import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
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

    await prisma.commonArea.delete({ where: { id } });

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

    const days = Array.from({ length: totalDays }).map((_, index) => {
      const dayStart = new Date(startDate);
      dayStart.setDate(dayStart.getDate() + index);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayReservations = reservations.filter(
        (reservation) =>
          reservation.date >= dayStart && reservation.date < dayEnd
      );

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

type ScheduleInput = {
  start: string;
  end: string;
  stepMinutes?: number;
};

function buildSlotsFromSchedule(schedule: ScheduleInput) {
  const stepMinutes = schedule.stepMinutes ?? 30;

  if (!Number.isInteger(stepMinutes) || stepMinutes <= 0) {
    throw new AppError("Invalid slot step", 400);
  }

  const startMinutes = toMinutes(schedule.start);
  const endMinutes = toMinutes(schedule.end);

  if (endMinutes <= startMinutes) {
    throw new AppError("End time must be after start time", 400);
  }

  const slots: {
    label: string;
    startsAt: string;
    endsAt: string;
    sortOrder: number;
  }[] = [];

  let order = 0;
  for (let start = startMinutes; start < endMinutes; start += stepMinutes) {
    const slotEnd = Math.min(start + stepMinutes, endMinutes);
    const startsAt = toTimeString(start);
    const endsAt = toTimeString(slotEnd);

    slots.push({
      label: `${startsAt} - ${endsAt}`,
      startsAt,
      endsAt,
      sortOrder: order++,
    });
  }

  return slots;
}

function toMinutes(time: string) {
  const [hoursPart, minutesPart] = time.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new AppError("Invalid time format", 400);
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new AppError("Invalid time format", 400);
  }

  return hours * 60 + minutes;
}

function toTimeString(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}
