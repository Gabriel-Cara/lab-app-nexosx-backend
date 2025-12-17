import { Request, Response } from "express";
import { hash } from "bcrypt";

import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";

import {
  paramsSchema,
  userCreateSchema,
  userIdParamsSchema,
  userUpdateSchema,
} from "@/validators/auth-schemas";

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

  async update(request: Request, response: Response) {
    const { id } = userIdParamsSchema.parse(request.params);

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
    } = userUpdateSchema.parse(request.body);

    const existing = await prisma.user.findUnique({
      where: { id },
      include: { residents: true },
    });

    if (!existing) {
      throw new AppError("User not found", 404);
    }

    if (email && email !== existing.email) {
      const emailInUse = await prisma.user.findUnique({ where: { email } });
      if (emailInUse) {
        throw new AppError("Email already in use", 400);
      }
    }

    const data: Prisma.UserUpdateInput = {};

    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (role !== undefined) data.role = role;
    if (apartment !== undefined) data.apartment = apartment ?? null;

    if (password) {
      data.password = await hash(password, 8);
    }

    const finalRole = role ?? existing.role;

    const normalizedBuilding =
      building !== undefined ? building || null : undefined;
    const normalizedVehicle =
      vehicle !== undefined ? vehicle || null : undefined;
    const normalizedEmergencyContact =
      emergencyContact !== undefined ? emergencyContact || null : undefined;

    if (finalRole === "resident") {
      if (
        normalizedBuilding !== undefined ||
        normalizedVehicle !== undefined ||
        normalizedEmergencyContact !== undefined ||
        !existing.residents
      ) {
        data.residents = {
          upsert: {
            create: {
              building: normalizedBuilding ?? null,
              vehicle: normalizedVehicle ?? null,
              emergencyContact: normalizedEmergencyContact ?? null,
            },
            update: {
              ...(normalizedBuilding !== undefined
                ? { building: normalizedBuilding }
                : {}),
              ...(normalizedVehicle !== undefined
                ? { vehicle: normalizedVehicle }
                : {}),
              ...(normalizedEmergencyContact !== undefined
                ? { emergencyContact: normalizedEmergencyContact }
                : {}),
            },
          },
        };
      }
    } else if (existing.residents) {
      data.residents = { delete: true };
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      include: { residents: true },
    });

    return response.json(updated);
  }

  async delete(request: Request, response: Response) {
    const { id } = userIdParamsSchema.parse(request.params);

    const existing = await prisma.user.findUnique({
      where: { id },
      include: { residents: true },
    });

    if (!existing) {
      throw new AppError("User not found", 404);
    }

    if (existing.residents) {
      await prisma.residentInfo.delete({
        where: { userId: id },
      });
    }

    await prisma.user.delete({
      where: { id },
    });

    return response.status(204).send();
  }
}

export { UsersController };
