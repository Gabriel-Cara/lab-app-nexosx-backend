import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import { Prisma } from "@prisma/client";
import {
  bookingCreateSchema,
  eventCreateSchema,
  eventIdParamsSchema,
  eventUpdateSchema,
} from "@/validators/event-schemas";
import { Request, Response } from "express";

class EventsController {
  async create(request: Request, response: Response) {
    const { description, allowBookings, ...eventData } = eventCreateSchema.parse(
      request.body
    );
    const userId = request.user!.id;

    const event = await prisma.event.create({
      data: {
        ...eventData,
        description: description ?? null,
        allowBookings: allowBookings ?? true,
        createdById: userId,
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
    const userId = request.user!.id;

    const events = await prisma.event.findMany({
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
    const { id } = eventIdParamsSchema.parse(request.params);
    const parsed = eventUpdateSchema.parse(request.body);

    const existing = await prisma.event.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError("Event not found", 404);
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
    const parsed = bookingCreateSchema.parse(request.body);
    const userId = request.user!.id;

    try {
      const booking = await prisma.$transaction(
        async (tx) => {
          const event = await tx.event.findUnique({
            where: { id: parsed.eventId },
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

          const existingBooking = await tx.eventBooking.findUnique({
            where: {
              eventId_residentId: {
                eventId: parsed.eventId,
                residentId: userId,
              },
            },
            select: { id: true },
          });

          if (existingBooking) {
            throw new AppError("Resident already booked", 400);
          }

          const bookingsCount = await tx.eventBooking.count({
            where: { eventId: parsed.eventId },
          });

          if (bookingsCount >= event.capacity) {
            throw new AppError("Event is full", 400);
          }

          return tx.eventBooking.create({
            data: {
              eventId: parsed.eventId,
              residentId: userId,
              notes: parsed.notes ?? null,
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
    const { id } = eventIdParamsSchema.parse(request.params);
    const userId = request.user!.id;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    const existing = await prisma.eventLike.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId,
        },
      },
    });

    if (existing) {
      return response.json({ liked: true });
    }

    await prisma.eventLike.create({
      data: {
        eventId: id,
        userId,
      },
    });

    return response.status(201).json({ liked: true });
  }

  async bookings(request: Request, response: Response) {
    const { id } = eventIdParamsSchema.parse(request.params);

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    const bookings = await prisma.eventBooking.findMany({
      where: { eventId: id },
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
    const { id } = eventIdParamsSchema.parse(request.params);
    const userId = request.user!.id;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    const existing = await prisma.eventLike.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId,
        },
      },
    });

    if (!existing) {
      return response.json({ liked: false });
    }

    await prisma.eventLike.delete({
      where: {
        eventId_userId: {
          eventId: id,
          userId,
        },
      },
    });

    return response.json({ liked: false });
  }

  async delete(request: Request, response: Response) {
    const { id } = eventIdParamsSchema.parse(request.params);

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    await prisma.$transaction([
      prisma.eventLike.deleteMany({ where: { eventId: id } }),
      prisma.eventBooking.deleteMany({ where: { eventId: id } }),
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
