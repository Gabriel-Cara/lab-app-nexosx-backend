import { Request, Response } from "express";
import { hash } from "bcrypt";

import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";

import { userCreateSchema } from "@/validators/auth-schemas";

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

  async list(_: Request, response: Response) {
    const users = await prisma.user.findMany({
      include: { residents: true },
      orderBy: { createdAt: "desc" },
    });
    return response.json(users);
  }
}

export { UsersController };
