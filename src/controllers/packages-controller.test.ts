import type { Request, Response } from "express";

import { AppError } from "@/utils/app-error";
import { prisma } from "@/database/prisma";
import { notifyResident } from "@/services/notification-service";
import { PackagesController } from "@/controllers/packages-controller";

jest.mock("@/env", () => ({
  env: {
    PACKAGE_CODE_TTL_MINUTES: 60,
    TWILIO_WHATSAPP_AUTH_CONTENT_SID: undefined,
  },
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-code"),
}));

jest.mock("@/utils/generate-code", () => ({
  generateCode: jest.fn().mockReturnValue("ABC123"),
}));

jest.mock("@/database/prisma", () => ({
  prisma: {
    package: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock("@/services/notification-service", () => ({
  notifyResident: jest.fn(),
}));

function createResponse() {
  const response = {} as Response;

  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);

  return response;
}

function createRequest() {
  return {
    params: { id: "11111111-1111-4111-8111-111111111111" },
    user: {
      id: "22222222-2222-4222-8222-222222222222",
      role: "manager",
      condominiumId: "33333333-3333-4333-8333-333333333333",
    },
  } as unknown as Request;
}

describe("PackagesController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("persists the new retrieval code before sending the resend notification", async () => {
    const controller = new PackagesController();
    const response = createResponse();
    const callOrder: string[] = [];

    prisma.package.findFirst = jest.fn().mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      status: "pending",
      description: "Caixa",
      carrier: "Correios",
      residentId: "44444444-4444-4444-8444-444444444444",
      resident: {
        name: "Maria",
        phone: "5511999999999",
      },
    });
    prisma.package.updateMany = jest.fn().mockImplementation(async () => {
      callOrder.push("update");
      return { count: 1 };
    });
    (notifyResident as jest.Mock).mockImplementation(async () => {
      callOrder.push("notify");
      return {
        status: "sent",
        channel: "whatsapp",
      };
    });

    await controller.resendCode(createRequest(), response);

    expect(callOrder).toEqual(["update", "notify"]);
    expect(prisma.package.updateMany).toHaveBeenCalledWith({
      where: {
        id: "11111111-1111-4111-8111-111111111111",
        condominiumId: "33333333-3333-4333-8333-333333333333",
        status: { in: ["pending", "delayed"] },
      },
      data: expect.objectContaining({
        codeHash: "hashed-code",
        codeAttempts: 0,
        codeHint: "**23",
      }),
    });
    expect(response.json).toHaveBeenCalledWith({
      ok: true,
      notification: {
        status: "sent",
        channel: "whatsapp",
      },
    });
  });

  it("keeps the persisted resend update and surfaces the notification error", async () => {
    const controller = new PackagesController();

    prisma.package.findFirst = jest.fn().mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      status: "pending",
      description: "Caixa",
      carrier: "Correios",
      residentId: "44444444-4444-4444-8444-444444444444",
      resident: {
        name: "Maria",
        phone: "5511999999999",
      },
    });
    prisma.package.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    (notifyResident as jest.Mock).mockResolvedValue({
      status: "failed",
      reason: "twilio_error",
      message: "gateway offline",
    });

    await expect(
      controller.resendCode(createRequest(), createResponse()),
    ).rejects.toMatchObject({
      message: "Não foi possível reenviar o código: gateway offline",
      statusCode: 502,
    });

    expect(prisma.package.updateMany).toHaveBeenCalledTimes(1);
    expect(notifyResident).toHaveBeenCalledTimes(1);
  });
});
