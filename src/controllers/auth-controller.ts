import { Request, Response } from "express";
import { compare, hash } from "bcrypt";

import { AppError } from "@/utils/app-error";
import { prisma } from "@/database/prisma";

import { loginSchema, setupPasswordSchema, userIdParamsSchema } from "@/validators/auth-schemas";
import { signToken } from "@/configs/token";
import { hashSetupToken } from "@/utils/password-setup-token";

class AuthController {
  async login(request: Request, response: Response) {
    const { email, password } = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const passwordMatched = await compare(password, user.password);

    if (!passwordMatched) {
      throw new AppError("Invalid credentials", 401);
    }

    const token = signToken({ sub: user.id, role: user.role });

    return response.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
    });
  }

  async me(request: Request, response: Response) {
    const { id } = userIdParamsSchema.parse(request.params);

    if (!id) {
      throw new AppError("Invalid JWT token", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id },
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
