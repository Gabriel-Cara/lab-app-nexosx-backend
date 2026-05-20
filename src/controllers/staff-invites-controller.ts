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
  staffInviteCreateSchema,
  staffInviteTokenSchema,
  staffSignupSchema,
} from "@/validators/staff-invite-schemas";
import { generateRandomPassword } from "@/utils/generate-random-password";
import { sendPasswordSetupEmail } from "@/services/mail/send-password-setup-email";
import { sendAccountConfirmationEmail } from "@/services/mail/send-account-confirmation-email";

const INVITE_TTL_HOURS = 24 * 7;

class StaffInvitesController {
  async create(request: Request, response: Response) {
    const { condominiumId: requestedCondominiumId } =
      staffInviteCreateSchema.parse(request.body ?? {});

    const user = request.user;
    if (!user) {
      throw new AppError("Unauthorized", 401);
    }

    const condominiumId =
      user.role === "admin"
        ? requestedCondominiumId
        : requireCondominiumId(request);

    if (!condominiumId) {
      throw new AppError("Condominium not selected", 403);
    }

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

    await prisma.staffInvite.create({
      data: {
        tokenHash,
        condominiumId: condominium.id,
        createdById: user.id,
        expiresAt,
      },
    });

    const inviteUrl = `${env.FRONT_URL}/cadastro-portaria?token=${token}`;

    return response.status(201).json({
      inviteUrl,
      expiresAt,
      condominium,
    });
  }

  async show(request: Request, response: Response) {
    const { token } = staffInviteTokenSchema.parse(request.params);
    const tokenHash = hashInviteToken(token);

    const invite = await prisma.staffInvite.findUnique({
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
    const { token, name, email, phone, shift, password } = staffSignupSchema.parse(
      request.body ?? {}
    );

    const tokenHash = hashInviteToken(token);
    const generatedPassword = password ?? generateRandomPassword(32);
    const hashedPassword = await hash(generatedPassword, 8);
    const setupToken = createInvitePasswordSetup(password);

    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.staffInvite.findUnique({
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
            email,
          },
        },
        select: { id: true },
      });

      if (existing) {
        throw new AppError("Email already in use", 400);
      }

      const created = await tx.user.create({
        data: {
          name,
          email,
          phone: phone ?? null,
          shift: shift?.trim() || null,
          role: "doorman",
          condominiumId: invite.condominiumId,
          password: hashedPassword,
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
    } else {
      await sendAccountConfirmationEmail({
        email: result.user.email,
        name: result.user.name,
        condominiumName: result.condominium?.name,
        condominiumCode: result.condominium?.code,
      });
    }

    return response.status(201).json({
      user: result.user,
      condominium: result.condominium,
    });
  }
}

export { StaffInvitesController };
