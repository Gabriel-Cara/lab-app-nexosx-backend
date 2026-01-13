import { Request, Response } from "express";
import { hash } from "bcrypt";

import { prisma } from "@/database/prisma";
import { env } from "@/env";
import { AppError } from "@/utils/app-error";
import { requireCondominiumId } from "@/utils/condominium";
import { generateInviteToken, hashInviteToken } from "@/utils/invite-token";
import {
  residentInviteCreateSchema,
  residentInviteTokenSchema,
  residentSignupSchema,
} from "@/validators/resident-invite-schemas";
import { generateRandomPassword } from "@/utils/generate-random-password";
import { generateSetupToken, hashSetupToken } from "@/utils/password-setup-token";
import { sendPasswordSetupEmail } from "@/services/mail/send-password-setup-email";

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

    if (invite.expiresAt.getTime() < Date.now()) {
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
      vehicle,
      emergencyContact,
      password,
    } = residentSignupSchema.parse(request.body ?? {});

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

    if (invite.expiresAt.getTime() < Date.now()) {
      throw new AppError("Invite expired", 410);
    }

    const existing = await prisma.user.findUnique({
      where: {
        condominiumId_email: {
          condominiumId: invite.condominiumId,
          email,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new AppError("Email already in use", 400);
    }

    const generatedPassword = password ?? generateRandomPassword(32);
    const hashedPassword = await hash(generatedPassword, 8);

    const created = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: phone ?? null,
        role: "resident",
        apartment: apartment.trim(),
        condominiumId: invite.condominiumId,
        password: hashedPassword,
        residents: {
          create: {
            building: building ?? null,
            vehicle: vehicle ?? null,
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

    if (!password) {
      const setupToken = generateSetupToken();
      const setupTokenHash = hashSetupToken(setupToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordSetupToken.upsert({
        where: { userId: created.id },
        update: {
          tokenHash: setupTokenHash,
          expiresAt,
          usedAt: null,
        },
        create: {
          userId: created.id,
          tokenHash: setupTokenHash,
          expiresAt,
        },
      });

      await sendPasswordSetupEmail(created.email, created.name, setupToken);
    }

    return response.status(201).json({
      user: created,
      condominium: invite.condominium,
    });
  }
}

export { ResidentInvitesController };
