import { Request, Response } from "express";
import { hash } from "bcrypt";

import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";

import { paramsSchema, userCreateSchema } from "@/validators/auth-schemas";

import type { Prisma } from "@prisma/client";

class UsersController {
  async create(request: Request, response: Response) {
    const {
      name,
      email,
      phone,
      role,
      apartment,
      password,
      building,
      vehicle,
      emergencyContact,
    } = userCreateSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new AppError("User already exists", 400);
    }

    const hashedPassword = await hash(password, 8);

    const created = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        role,
        apartment: apartment ?? null,
        password: hashedPassword,
        ...(role === "resident"
          ? {
              residents: {
                create: {
                  building,
                  vehicle: vehicle ?? null,
                  emergencyContact: emergencyContact ?? null,
                },
              },
            }
          : {}),
      },
    });

    return response.status(201).json(created);
  }

  async list(request: Request, response: Response) {
    const {
      name,
      apartment,
      phone,
      role,
      search,
      page,
      limit,
    } = paramsSchema.parse(request.query);

    const where: Prisma.UserWhereInput = {
      name: name ? { contains: name, mode: "insensitive" } : undefined,
      apartment: apartment
        ? { contains: apartment, mode: "insensitive" }
        : undefined,
      phone: phone ? { contains: phone, mode: "insensitive" } : undefined,
      role: role ? { equals: role } : undefined,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { apartment: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        include: { residents: true },
        orderBy: { createdAt: "desc" },
        where,
        take: limit,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    response.set("total-count", String(total));
    response.set("total-pages", String(totalPages));
    response.set("page", String(page));
    response.set("limit", String(limit));

    return response.json(users);
  }
}

export { UsersController };
