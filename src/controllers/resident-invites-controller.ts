import { Request, Response } from "express";
import { hash } from "bcrypt";

import { prisma } from "@/database/prisma";
import { env } from "@/env";
import {
  createInvitePasswordSetup,
  isInviteExpired,
} from "@/services/invites/invite-signup";
import { AppError } from "@/utils/app-error";
import { requireCondominiumId } from "@/utils/condominium";
import { generateInviteToken, hashInviteToken } from "@/utils/invite-token";
import {
  residentInviteCreateSchema,
  residentInviteTokenSchema,
  residentSignupSchema,
} from "@/validators/resident-invite-schemas";
import { generateRandomPassword } from "@/utils/generate-random-password";
import { sendPasswordSetupEmail } from "@/services/mail/send-password-setup-email";
import { normalizeParkingSpot, normalizeVehiclePlate } from "@/utils/vehicle";
import { resolveResidenceAssignment } from "@/utils/residence";

const INVITE_TTL_HOURS = 24 * 7;

class ResidentInvitesController {
  async create(request: Request, response: Response) {
    residentInviteCreateSchema.parse(request.body ?? {});

    const user = request.user;
    if (!user) {
      throw new AppError("Unauthorized", 401);
    }

    const condominiumId = requireCondominiumId(request);

    const condominium = await prisma.condominium.findUnique({
      where: { id: condominiumId },
      select: { id: true, name: true, code: true },
    });

    if (!condominium) {
      throw new AppError("Condominium not found", 404);
    }

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    await prisma.residentInvite.create({
      data: {
        tokenHash,
        condominiumId: condominium.id,
        createdById: user.id,
        expiresAt,
      },
    });

    const inviteUrl = `${env.FRONT_URL}/cadastro-morador?token=${token}`;

    return response.status(201).json({
      inviteUrl,
      expiresAt,
      condominium,
    });
  }

  async show(request: Request, response: Response) {
    const { token } = residentInviteTokenSchema.parse(request.params);
    const tokenHash = hashInviteToken(token);

    const invite = await prisma.residentInvite.findUnique({
      where: { tokenHash },
      include: {
        condominium: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!invite) {
      throw new AppError("Invite not found", 404);
    }

    if (isInviteExpired(invite.expiresAt)) {
      throw new AppError("Invite expired", 410);
    }

    return response.json({
      condominium: invite.condominium,
      expiresAt: invite.expiresAt,
    });
  }

  async signUp(request: Request, response: Response) {
    const {
      token,
      name,
      email,
      phone,
      apartment,
      building,
      vehicles,
      emergencyContact,
      password,
    } = residentSignupSchema.parse(request.body ?? {});

    const tokenHash = hashInviteToken(token);
    const generatedPassword = password ?? generateRandomPassword(32);
    const hashedPassword = await hash(generatedPassword, 8);
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedApartment = apartment.trim();
    const setupToken = createInvitePasswordSetup(password);

    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.residentInvite.findUnique({
        where: { tokenHash },
        include: {
          condominium: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      if (!invite) {
        throw new AppError("Invite not found", 404);
      }

      if (isInviteExpired(invite.expiresAt)) {
        throw new AppError("Invite expired", 410);
      }

      const existing = await tx.user.findUnique({
        where: {
          condominiumId_email: {
            condominiumId: invite.condominiumId,
            email: normalizedEmail,
          },
        },
        select: { id: true },
      });

      if (existing) {
        throw new AppError("Email already in use", 400);
      }

      const residenceAssignment = await resolveResidenceAssignment(tx, {
        condominiumId: invite.condominiumId,
        apartment: normalizedApartment,
        building,
      });

      const created = await tx.user.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          phone: phone ?? null,
          role: "resident",
          residenceId: residenceAssignment.residenceId,
          apartment: residenceAssignment.apartment,
          condominiumId: invite.condominiumId,
          password: hashedPassword,
          residents: {
            create: {
              building: residenceAssignment.building,
              vehicles: vehicles?.length
                ? {
                    create: vehicles.map((vehicle) => ({
                      model: vehicle.model.trim(),
                      plate: normalizeVehiclePlate(vehicle.plate),
                      parkingSpot: normalizeParkingSpot(vehicle.parkingSpot),
                      year: vehicle.year,
                    })),
                  }
                : undefined,
              emergencyContact: emergencyContact ?? null,
              condominiumId: invite.condominiumId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (setupToken) {
        await tx.passwordSetupToken.upsert({
          where: { userId: created.id },
          update: {
            tokenHash: setupToken.tokenHash,
            expiresAt: setupToken.expiresAt,
            usedAt: null,
          },
          create: {
            userId: created.id,
            tokenHash: setupToken.tokenHash,
            expiresAt: setupToken.expiresAt,
          },
        });
      }

      return {
        user: created,
        condominium: invite.condominium,
      };
    });

    if (setupToken) {
      await sendPasswordSetupEmail(result.user.email, result.user.name, setupToken.token);
    }

    return response.status(201).json({
      user: result.user,
      condominium: result.condominium,
    });
  }
}

export { ResidentInvitesController };
