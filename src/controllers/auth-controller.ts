import { Request, Response } from "express";
import { compare, hash } from "bcrypt";

import { AppError } from "@/utils/app-error";
import { prisma } from "@/database/prisma";

import { loginSchema, setupPasswordSchema, userIdParamsSchema } from "@/validators/auth-schemas";
import { signToken } from "@/configs/token";
import { hashSetupToken } from "@/utils/password-setup-token";
import { userSelect } from "@/utils/user-select";

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

    const masterUser = matched.find((user) => user.role === "master");

    if (masterUser) {
      const token = signToken({
        sub: masterUser.id,
        role: masterUser.role,
        condominiumId: null,
      });

      return response.json({
        token,
        user: {
          id: masterUser.id,
          name: masterUser.name,
          email: masterUser.email,
          role: masterUser.role,
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

    return response.json({ message: "Password set successfully" });
  }
}

export { AuthController };
