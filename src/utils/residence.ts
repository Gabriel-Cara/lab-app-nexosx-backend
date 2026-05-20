import type { Prisma } from "@prisma/client";

import { AppError } from "@/utils/app-error";

type ResidenceClient = Pick<Prisma.TransactionClient, "block" | "residence">;

type ResolveResidenceParams = {
  condominiumId: string;
  residenceId?: string | null;
  apartment?: string | null;
  building?: string | null;
};

export async function resolveResidenceAssignment(
  client: ResidenceClient,
  { condominiumId, residenceId, apartment, building }: ResolveResidenceParams
) {
  const normalizedResidenceId = residenceId?.trim();

  if (normalizedResidenceId) {
    const residence = await client.residence.findFirst({
      where: { id: normalizedResidenceId, condominiumId },
      include: { block: true },
    });

    if (!residence) {
      throw new AppError("Residence not found", 404);
    }

    return {
      residenceId: residence.id,
      apartment: residence.number,
      building: residence.block.name,
    };
  }

  const normalizedApartment = apartment?.trim();

  if (!normalizedApartment) {
    return {
      residenceId: null,
      apartment: apartment ?? null,
      building: building ?? null,
    };
  }

  const blockName = building?.trim() || "Bloco único";

  const block = await client.block.upsert({
    where: {
      condominiumId_name: {
        condominiumId,
        name: blockName,
      },
    },
    update: {},
    create: {
      condominiumId,
      name: blockName,
    },
  });

  const residence = await client.residence.upsert({
    where: {
      blockId_number: {
        blockId: block.id,
        number: normalizedApartment,
      },
    },
    update: {},
    create: {
      condominiumId,
      blockId: block.id,
      number: normalizedApartment,
    },
  });

  return {
    residenceId: residence.id,
    apartment: residence.number,
    building: block.name,
  };
}
