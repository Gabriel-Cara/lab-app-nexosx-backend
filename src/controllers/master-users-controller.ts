import { Request, Response } from "express";

import { prisma } from "@/database/prisma";

class MasterUsersController {
  async list(_: Request, response: Response) {
    const users = await prisma.user.findMany({
      where: {
        role: { not: "master" },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        condominium: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return response.json(users);
  }
}

export { MasterUsersController };
