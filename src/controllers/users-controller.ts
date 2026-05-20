import { Request, Response } from "express";
import { hash } from "bcrypt";

import { prisma } from "@/database/prisma";
import { AppError } from "@/utils/app-error";
import { userSelect } from "@/utils/user-select";

import {
  paramsSchema,
  userCreateSchema,
  userIdParamsSchema,
  userUpdateSchema,
} from "@/validators/auth-schemas";

import type { Prisma } from "@prisma/client";
import {
  generateSetupToken,
  hashSetupToken,
} from "@/utils/password-setup-token";
import { sendPasswordSetupEmail } from "@/services/mail/send-password-setup-email";
import { generateRandomPassword } from "@/utils/generate-random-password";
import { deleteUserWithRelations } from "@/services/user-deletion-service";
import { requireCondominiumId } from "@/utils/condominium";
import {
  formatLegacyVehiclePlate,
  normalizeParkingSpot,
  normalizeVehiclePlate,
} from "@/utils/vehicle";
import { resolveResidenceAssignment } from "@/utils/residence";

class UsersController {
  async create(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const {
      name,
      email,
      phone,
      role,
      apartment,
      residenceId,
      shift,
      password,
      building,
      vehicles,
      emergencyContact,
    } = userCreateSchema.parse(request.body);
    const normalizedShift = shift?.trim();
    const normalizedVehicles = vehicles?.map((vehicle) => ({
      model: vehicle.model.trim(),
      plate: normalizeVehiclePlate(vehicle.plate),
      parkingSpot: normalizeParkingSpot(vehicle.parkingSpot),
      year: vehicle.year,
    }));

    const existing = await prisma.user.findUnique({
      where: {
        condominiumId_email: {
          condominiumId,
          email,
        },
      },
    });

    if (existing) {
      throw new AppError("User already exists", 400);
    }

    // If no password was provided, we still need to store a hash in the DB.
    // We'll use a strong random value so the resident cannot log in until setting their own password.
    const generatedPassword = password ?? generateRandomPassword(32);
    const hashedPassword = await hash(generatedPassword, 8);

    const created = await prisma.$transaction(async (tx) => {
      const residenceAssignment =
        role === "resident"
          ? await resolveResidenceAssignment(tx, {
              condominiumId,
              residenceId,
              apartment,
              building,
            })
          : { residenceId: null, apartment: apartment ?? null, building };

      return tx.user.create({
        data: {
          name,
          email,
          phone: phone ?? null,
          role,
          residenceId: residenceAssignment.residenceId,
          apartment: residenceAssignment.apartment,
          shift: normalizedShift || null,
          condominiumId,
          password: hashedPassword,
          ...(role === "resident"
            ? {
                residents: {
                  create: {
                    building: residenceAssignment.building,
                    vehicles: normalizedVehicles?.length
                      ? { create: normalizedVehicles }
                      : undefined,
                    emergencyContact: emergencyContact ?? null,
                    condominiumId,
                  },
                },
              }
            : {}),
        },
      });
    });

    // Invite flow: if staff created a resident/staff without specifying a password,
    // send an email with a one-time token so the user can set their own password.
    if ((role === "resident" || role === "doorman") && !password) {
      const token = generateSetupToken();
      const tokenHash = hashSetupToken(token);

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordSetupToken.upsert({
        where: { userId: created.id },
        update: {
          tokenHash,
          expiresAt,
          usedAt: null,
        },
        create: {
          userId: created.id,
          tokenHash,
          expiresAt,
        },
      });

      await sendPasswordSetupEmail(email, name, token);
    }

    return response.status(201).json({
      user: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
      },
    });
  }

  async resendInvite(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const userId = request.params.id;

    const user = await prisma.user.findFirst({
      where: { id: userId, condominiumId },
    });

    if (!user || (user.role !== "resident" && user.role !== "doorman")) {
      return response.status(404).json({ message: "Usuário não encontrado" });
    }

    const token = generateSetupToken();
    const tokenHash = hashSetupToken(token);

    await prisma.passwordSetupToken.upsert({
      where: { userId },
      update: {
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: null,
      },
      create: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await sendPasswordSetupEmail(user.email, user.name, token);

    return response.json({ message: "Convite reenviado com sucesso" });
  }

  async list(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const {
      name,
      apartment,
      phone,
      role,
      search,
      page,
      limit,
    } = paramsSchema.parse(request.query);
    const normalizedVehicleSearch = search
      ? normalizeVehiclePlate(search)
      : "";
    const legacyVehicleSearch = normalizedVehicleSearch
      ? formatLegacyVehiclePlate(normalizedVehicleSearch)
      : "";

    const where: Prisma.UserWhereInput = {
      condominiumId,
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
              {
                residents: {
                  is: {
                    building: { contains: search, mode: "insensitive" },
                  },
                },
              },
              {
                residents: {
                  is: {
                    emergencyContact: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                residents: {
                  is: {
                    vehicles: {
                      some: {
                        model: { contains: search, mode: "insensitive" },
                      },
                    },
                  },
                },
              },
              {
                residents: {
                  is: {
                    vehicles: {
                      some: {
                        parkingSpot: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                },
              },
              ...(normalizedVehicleSearch
                ? [
                    {
                      residents: {
                        is: {
                          vehicles: {
                            some: {
                              plate: {
                                startsWith: normalizedVehicleSearch,
                              },
                            },
                          },
                        },
                      },
                    },
                    ...(legacyVehicleSearch !== normalizedVehicleSearch
                      ? [
                          {
                            residents: {
                              is: {
                                vehicles: {
                                  some: {
                                    plate: {
                                      startsWith: legacyVehicleSearch,
                                    },
                                  },
                                },
                              },
                            },
                          },
                        ]
                      : []),
                  ]
                : []),
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        select: userSelect,
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
    const condominiumId = requireCondominiumId(request);
    const { id } = userIdParamsSchema.parse(request.params);

    const {
      name,
      email,
      phone,
      role,
      apartment,
      residenceId,
      shift,
      password,
      building,
      vehicles,
      emergencyContact,
    } = userUpdateSchema.parse(request.body);

    const existing = await prisma.user.findFirst({
      where: { id, condominiumId },
      include: { residents: true, residence: { include: { block: true } } },
    });

    if (!existing) {
      throw new AppError("User not found", 404);
    }

    if (email && email !== existing.email) {
      const emailInUse = await prisma.user.findUnique({
        where: {
          condominiumId_email: {
            condominiumId,
            email,
          },
        },
        select: { id: true },
      });

      if (emailInUse && emailInUse.id !== id) {
        throw new AppError("Email already in use", 400);
      }
    }

    const data: Prisma.UserUpdateInput = {};

    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (role !== undefined) data.role = role;
    if (apartment !== undefined) data.apartment = apartment ?? null;
    if (shift !== undefined) data.shift = shift?.trim() || null;

    let resolvedResidenceBuilding: string | null | undefined;

    if (
      (role ?? existing.role) === "resident" &&
      (residenceId !== undefined || apartment !== undefined || building !== undefined)
    ) {
      const residenceAssignment = await resolveResidenceAssignment(prisma, {
        condominiumId,
        residenceId,
        apartment: apartment ?? existing.apartment,
        building: building ?? existing.residence?.block.name ?? existing.residents?.building,
      });

      data.residence = residenceAssignment.residenceId
        ? { connect: { id: residenceAssignment.residenceId } }
        : { disconnect: true };
      data.apartment = residenceAssignment.apartment;
      resolvedResidenceBuilding = residenceAssignment.building;
    }

    if ((role ?? existing.role) !== "resident" && existing.residenceId) {
      data.residence = { disconnect: true };
    }

    if (password) {
      data.password = await hash(password, 8);
    }

    const finalRole = role ?? existing.role;

    const normalizedBuilding =
      resolvedResidenceBuilding !== undefined
        ? resolvedResidenceBuilding
        : building !== undefined
          ? building || null
          : undefined;
    const normalizedVehicles =
      vehicles !== undefined
        ? vehicles.map((vehicle) => ({
            model: vehicle.model.trim(),
            plate: normalizeVehiclePlate(vehicle.plate),
            parkingSpot: normalizeParkingSpot(vehicle.parkingSpot),
            year: vehicle.year,
          }))
        : undefined;
    const normalizedEmergencyContact =
      emergencyContact !== undefined ? emergencyContact || null : undefined;

    if (finalRole === "resident") {
      if (
        normalizedBuilding !== undefined ||
        normalizedVehicles !== undefined ||
        normalizedEmergencyContact !== undefined ||
        !existing.residents
      ) {
        data.residents = {
          upsert: {
            create: {
              building: normalizedBuilding ?? null,
              vehicles: normalizedVehicles?.length
                ? { create: normalizedVehicles }
                : undefined,
              emergencyContact: normalizedEmergencyContact ?? null,
              condominiumId,
            },
            update: {
              ...(normalizedBuilding !== undefined
                ? { building: normalizedBuilding }
                : {}),
              ...(normalizedVehicles !== undefined
                ? {
                    vehicles: {
                      deleteMany: {},
                      ...(normalizedVehicles.length
                        ? { create: normalizedVehicles }
                        : {}),
                    },
                  }
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
      select: userSelect,
    });

    return response.json(updated);
  }

  async delete(request: Request, response: Response) {
    const condominiumId = requireCondominiumId(request);
    const { id } = userIdParamsSchema.parse(request.params);

    const existing = await prisma.user.findFirst({
      where: { id, condominiumId },
      include: { residents: true },
    });

    if (!existing) {
      throw new AppError("User not found", 404);
    }

    await deleteUserWithRelations(id, condominiumId);

    return response.status(204).send();
  }
}

export { UsersController };
