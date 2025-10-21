import { prisma } from "@/database/prisma";
import { notifyResident } from "@/services/notification-service";
import { generateCode } from "@/utils/generate-code";
import { packageCreateSchema } from "@/validators/package-schemas";
import { Request, Response } from "express";

class PackageController {
  async create(request: Request, response: Response) {
    const { residentId, description, carrier } = packageCreateSchema.parse(request.body);

    const code = generateCode();

    const pkg = await prisma.package.create({
      data: {
        code,
        residentId,
        description,
        carrier: carrier ?? null,
        createdById: request.user!.id
      },
      include: {
        resident: {
          select: {
            name: true,
            phone: true
          }
        }
      }
    });

    if(pkg.resident.phone) {
      await notifyResident({
        phone: pkg.resident.phone,
        message: `Olá ${pkg.resident.name}, sua encomenda chegou! Código: ${code}`
      });
    }

    return response.status(201).json(pkg);
  }

  async list() {
    
  }

  retrieve() {

  }
}

export { PackageController };