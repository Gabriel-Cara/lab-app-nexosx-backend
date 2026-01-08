import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import { Prisma } from "@prisma/client";
import {
  bookingCreateSchema,
  eventCreateSchema,
  eventIdParamsSchema,
  eventUpdateSchema,
} from "@/validators/event-schemas";
import { requireCondominiumId } from "@/utils/condominium";
import { Request, Response } from "express";

class EventsController {
  async create(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { description, allowBookings, ...eventData } = eventCreateSchema.parse(
      request.body
    );
    const userId = request.user!.id;

    const area = await prisma.commonArea.findFirst({
      where: { id: eventData.commonAreaId, condominiumId },
      select: { id: true },
    });

    if (!area) {
      throw new AppError("Area not found", 404);
    }

    const event = await prisma.event.create({
      data: {
        ...eventData,
        description: description ?? null,
        allowBookings: allowBookings ?? true,
        createdById: userId,
        condominiumId,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            capacity: true,
          },
        },
        createdBy: { select: { name: true } },
        _count: { select: { bookings: true, likes: true } },
        bookings: { where: { residentId: userId }, select: { residentId: true } },
        likes: { where: { userId }, select: { userId: true } },
      },
    });

    return response.status(201).json(buildEventPayload(event, userId));
  }

  async list(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const userId = request.user!.id;

    const events = await prisma.event.findMany({
      where: { condominiumId },
      include: {
        location: { select: { id: true, name: true, capacity: true } },
        createdBy: { select: { name: true } },
        _count: { select: { bookings: true, likes: true } },
        bookings: { where: { residentId: userId }, select: { residentId: true } },
        likes: { where: { userId }, select: { userId: true } },
      },
      orderBy: { startDate: "desc" },
    });

    const payload = events.map((event) => buildEventPayload(event, userId));

    return response.json(payload);
  }

  async update(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = eventIdParamsSchema.parse(request.params);
    const parsed = eventUpdateSchema.parse(request.body);

    const existing = await prisma.event.findFirst({
      where: { id, condominiumId },
    });

    if (!existing) {
      throw new AppError("Event not found", 404);
    }

    if (parsed.commonAreaId) {
      const area = await prisma.commonArea.findFirst({
        where: { id: parsed.commonAreaId, condominiumId },
        select: { id: true },
      });

      if (!area) {
        throw new AppError("Area not found", 404);
      }
    }

    const updateData = Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value !== undefined)
    );

    const startDate = parsed.startDate ?? existing.startDate;
    const endDate = parsed.endDate ?? existing.endDate;

    if (endDate < startDate) {
      throw new AppError("End date must be after start date", 400);
    }

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        location: { select: { id: true, name: true, capacity: true } },
        createdBy: { select: { name: true } },
        _count: { select: { bookings: true, likes: true } },
        bookings: { where: { residentId: request.user!.id }, select: { residentId: true } },
        likes: { where: { userId: request.user!.id }, select: { userId: true } },
      },
    });

    return response.json(buildEventPayload(updated, request.user!.id));
  }

  async book(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const parsed = bookingCreateSchema.parse(request.body);
    const userId = request.user!.id;

    try {
      const booking = await prisma.$transaction(
        async (tx) => {
          const event = await tx.event.findFirst({
            where: { id: parsed.eventId, condominiumId },
            select: {
              id: true,
              allowBookings: true,
              capacity: true,
            },
          });

          if (!event) {
            throw new AppError("Event not found", 404);
          }

          if (!event.allowBookings) {
            throw new AppError("Event does not allow bookings", 400);
          }

          const existingBooking = await tx.eventBooking.findFirst({
            where: {
              eventId: parsed.eventId,
              residentId: userId,
              condominiumId,
            },
            select: { id: true },
          });

          if (existingBooking) {
            throw new AppError("Resident already booked", 400);
          }

          const bookingsCount = await tx.eventBooking.count({
            where: { eventId: parsed.eventId, condominiumId },
          });

          if (bookingsCount >= event.capacity) {
            throw new AppError("Event is full", 400);
          }

          return tx.eventBooking.create({
            data: {
              eventId: parsed.eventId,
              residentId: userId,
              notes: parsed.notes ?? null,
              condominiumId,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      return response.status(201).json(booking);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new AppError("Resident already booked", 400);
        }
        if (error.code === "P2034") {
          throw new AppError("Event is full", 409);
        }
      }

      throw error;
    }
  }

  async like(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = eventIdParamsSchema.parse(request.params);
    const userId = request.user!.id;

    const event = await prisma.event.findFirst({
      where: { id, condominiumId },
    });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    const existing = await prisma.eventLike.findFirst({
      where: { eventId: id, userId, condominiumId },
    });

    if (existing) {
      return response.json({ liked: true });
    }

    await prisma.eventLike.create({
      data: {
        eventId: id,
        userId,
        condominiumId,
      },
    });

    return response.status(201).json({ liked: true });
  }

  async bookings(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = eventIdParamsSchema.parse(request.params);

    const event = await prisma.event.findFirst({
      where: { id, condominiumId },
      select: { id: true },
    });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    const bookings = await prisma.eventBooking.findMany({
      where: { eventId: id, condominiumId },
      select: {
        resident: {
          select: {
            name: true,
            apartment: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const normalized = bookings.map((booking) => ({
      name: booking.resident.name,
      apartment: booking.resident.apartment ?? null,
    }));

    return response.json(normalized);
  }

  async unlike(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = eventIdParamsSchema.parse(request.params);
    const userId = request.user!.id;

    const event = await prisma.event.findFirst({
      where: { id, condominiumId },
    });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    const existing = await prisma.eventLike.findFirst({
      where: { eventId: id, userId, condominiumId },
    });

    if (!existing) {
      return response.json({ liked: false });
    }

    await prisma.eventLike.deleteMany({
      where: { eventId: id, userId, condominiumId },
    });

    return response.json({ liked: false });
  }

  async delete(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = eventIdParamsSchema.parse(request.params);

    const event = await prisma.event.findFirst({
      where: { id, condominiumId },
    });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    await prisma.$transaction([
      prisma.eventLike.deleteMany({ where: { eventId: id, condominiumId } }),
      prisma.eventBooking.deleteMany({ where: { eventId: id, condominiumId } }),
      prisma.event.delete({ where: { id } }),
    ]);

    return response.status(204).send();
  }
}

export { EventsController };

function buildEventPayload(
  event: {
    bookings?: { residentId: string }[];
    likes?: { userId: string }[];
    _count?: {
      bookings: number;
      likes: number;
    };
  } & Record<string, any>,
  userId: string
) {
  const { bookings, likes, _count, ...rest } = event;
  const bookingsCount = _count?.bookings ?? bookings?.length ?? 0;
  const likesCount = _count?.likes ?? likes?.length ?? 0;
  const bookedByUser = bookings
    ? bookings.some((booking) => booking.residentId === userId)
    : false;
  const likedByUser = likes
    ? likes.some((like) => like.userId === userId)
    : false;

  return {
    ...rest,
    bookingsCount,
    likesCount,
    bookedByUser,
    likedByUser,
  };
}
