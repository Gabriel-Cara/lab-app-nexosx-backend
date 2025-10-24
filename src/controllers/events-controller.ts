import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import {
  bookingCreateSchema,
  eventCreateSchema,
} from "@/validators/event-schemas";
import { Request, Response } from "express";

class EventsController {
  async create(request: Request, response: Response) {
    const { description, ...eventData } = eventCreateSchema.parse(request.body);

    const event = await prisma.event.create({
      data: {
        ...eventData,
        description: description ?? null,
        createdById: request.user!.id,
      },
    });

    return response.status(201).json(event);
  }

  async list(_: Request, response: Response) {
    const events = await prisma.event.findMany({
      include: {
        bookings: {
          include: {
            resident: { select: { id: true, name: true, apartment: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { startDate: "asc" },
    });

    return response.json(events);
  }

  async book(request: Request, response: Response) {
    const parsed = bookingCreateSchema.parse(request.body);

    const event = await prisma.event.findUnique({
      where: { id: parsed.eventId },
      include: { bookings: true },
    });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    if (event.bookings.length >= event.capacity) {
      throw new AppError("Event is full", 400);
    }

    const booking = await prisma.eventBooking.create({
      data: {
        eventId: parsed.eventId,
        residentId: request.user!.id,
        notes: parsed.notes ?? null,
      },
    });

    return response.status(201).json(booking);
  }
}

export { EventsController };