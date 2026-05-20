import { Request, Response } from "express";
import { compare, hash } from "bcrypt";

import { AppError } from "@/utils/app-error";
import { prisma } from "@/database/prisma";

import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  setupPasswordSchema,
  userIdParamsSchema,
} from "@/validators/auth-schemas";
import { signToken } from "@/configs/token";
import { generateSetupToken, hashSetupToken } from "@/utils/password-setup-token";
import { userSelect } from "@/utils/user-select";
import { sendAccountConfirmationEmail } from "@/services/mail/send-account-confirmation-email";
import { sendPasswordResetEmail } from "@/services/mail/send-password-reset-email";

class AuthController {
  async login(request: Request, response: Response) {
    const { email, password } = loginSchema.parse(request.body);

    const users = await prisma.user.findMany({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        condominiumId: true,
        condominium: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (users.length === 0) {
      throw new AppError("Invalid credentials", 401);
    }

    const matched: typeof users = [];

    for (const user of users) {
      const passwordMatched = await compare(password, user.password);
      if (passwordMatched) {
        matched.push(user);
      }
    }

    if (matched.length === 0) {
      throw new AppError("Invalid credentials", 401);
    }

    const adminUser = matched.find((user) => user.role === "admin");

    if (adminUser) {
      const token = signToken({
        sub: adminUser.id,
        role: adminUser.role,
        condominiumId: null,
      });

      return response.json({
        token,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          condominiumId: null,
        },
      });
    }

    if (matched.length === 1) {
      const user = matched[0];

      if (!user.condominiumId) {
        throw new AppError("Condominium not selected", 403);
      }

      const token = signToken({
        sub: user.id,
        role: user.role,
        condominiumId: user.condominiumId,
      });

      return response.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          condominiumId: user.condominiumId,
        },
        condominium: user.condominium,
      });
    }

    const candidates = matched
      .filter((user) => user.condominiumId)
      .map((user) => ({
        token: signToken({
          sub: user.id,
          role: user.role,
          condominiumId: user.condominiumId,
        }),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          condominiumId: user.condominiumId,
        },
        condominium: user.condominium,
      }));

    return response.json({ candidates });
  }

  async me(request: Request, response: Response) {
    const { id } = userIdParamsSchema.parse(request.params);

    if (!request.user || request.user.id !== id) {
      throw new AppError("Unauthorized", 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return response.json(user);
  }

  async setupPassword(request: Request, response: Response) {
    const { token, password } = setupPasswordSchema.parse(request.body);

    const tokenHash = hashSetupToken(token);

    const record = await prisma.passwordSetupToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            condominium: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!record) {
      throw new AppError("Invalid token", 400);
    }

    if (record.usedAt) {
      throw new AppError("Token already used", 400);
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new AppError("Token expired", 400);
    }

    const newHashed = await hash(password, 8);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: newHashed },
      }),
      prisma.passwordSetupToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    if (record.user?.role === "doorman") {
      await sendAccountConfirmationEmail({
        email: record.user.email,
        name: record.user.name,
        condominiumName: record.user.condominium?.name,
        condominiumCode: record.user.condominium?.code,
      });
    }

    return response.json({ message: "Password set successfully" });
  }

  async forgotPassword(request: Request, response: Response) {
    const { email } = forgotPasswordSchema.parse(request.body);

    const users = await prisma.user.findMany({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        condominium: {
          select: { name: true, code: true },
        },
      },
    });

    if (users.length === 0) {
      return response.json({
        message: "If an account exists, a reset email was sent.",
      });
    }

    for (const user of users) {
      const token = generateSetupToken();
      const tokenHash = hashSetupToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        token,
        condominiumName: user.condominium?.name,
        condominiumCode: user.condominium?.code,
      });
    }

    return response.json({
      message: "If an account exists, a reset email was sent.",
    });
  }

  async resetPassword(request: Request, response: Response) {
    const { token, password } = resetPasswordSchema.parse(request.body);

    const tokenHash = hashSetupToken(token);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      throw new AppError("Invalid token", 400);
    }

    if (record.usedAt) {
      throw new AppError("Token already used", 400);
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new AppError("Token expired", 400);
    }

    const newHashed = await hash(password, 8);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: newHashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return response.json({ message: "Password reset successfully" });
  }
}

export { AuthController };
