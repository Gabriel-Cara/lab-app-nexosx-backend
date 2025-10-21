import { Request, Response } from "express";
import { compare } from "bcrypt";

import { AppError } from "@/utils/app-error";
import { prisma } from "@/database/prisma";

import { loginSchema } from "@/validators/auth-schemas";
import { signToken } from "@/configs/token";

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
        role: user.role,
        apartment: user.apartment,
      },
    });
  }

  async me(request: Request, response: Response) {
    const userId = request.user?.id;
    if (!userId) {
      throw new AppError("Invalid JWT token", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { residents: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return response.json(user);
  }
}

export { AuthController };
