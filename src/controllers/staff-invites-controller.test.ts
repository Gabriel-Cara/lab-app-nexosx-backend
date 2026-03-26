import type { Request, Response } from "express";

import { prisma } from "@/database/prisma";
import { sendAccountConfirmationEmail } from "@/services/mail/send-account-confirmation-email";
import { sendPasswordSetupEmail } from "@/services/mail/send-password-setup-email";
import { StaffInvitesController } from "@/controllers/staff-invites-controller";

jest.mock("@/env", () => ({
  env: {
    FRONT_URL: "https://app.example.com",
  },
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

jest.mock("@/database/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock("@/services/mail/send-account-confirmation-email", () => ({
  sendAccountConfirmationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/mail/send-password-setup-email", () => ({
  sendPasswordSetupEmail: jest.fn().mockResolvedValue(undefined),
}));

type TransactionMock = {
  staffInvite: {
    findUnique: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  passwordSetupToken: {
    upsert: jest.Mock;
  };
};

function createResponse() {
  const response = {} as Response;

  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);

  return response;
}

function createRequest(body: Record<string, unknown>) {
  return {
    body,
  } as unknown as Request;
}

function createTransactionMock(createdUser: {
  id: string;
  name: string;
  email: string;
  role: string;
}): TransactionMock {
  return {
    staffInvite: {
      findUnique: jest.fn().mockResolvedValue({
        id: "invite-1",
        condominiumId: "condo-1",
        expiresAt: new Date("2099-03-25T12:00:00.000Z"),
        condominium: {
          id: "condo-1",
          name: "Condominio Teste",
          code: "ABC123",
        },
      }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(createdUser),
    },
    passwordSetupToken: {
      upsert: jest.fn(),
    },
  };
}

describe("StaffInvitesController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows the same invite link to be used for more than one staff signup before expiry", async () => {
    const controller = new StaffInvitesController();
    const transactionMocks = [
      createTransactionMock({
        id: "staff-1",
        name: "Alice",
        email: "alice@example.com",
        role: "staff",
      }),
      createTransactionMock({
        id: "staff-2",
        name: "Bob",
        email: "bob@example.com",
        role: "staff",
      }),
    ];

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: TransactionMock) => Promise<unknown>) =>
        callback(transactionMocks.shift() as TransactionMock),
    );

    const firstRequest = createRequest({
      token: "t".repeat(20),
      name: "Alice",
      email: "alice@example.com",
      password: "super-secret",
    });
    const secondRequest = createRequest({
      token: "t".repeat(20),
      name: "Bob",
      email: "bob@example.com",
      password: "super-secret",
    });

    const firstResponse = createResponse();
    const secondResponse = createResponse();

    await controller.signUp(firstRequest, firstResponse);
    await controller.signUp(secondRequest, secondResponse);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(sendAccountConfirmationEmail).toHaveBeenCalledTimes(2);
    expect(sendPasswordSetupEmail).not.toHaveBeenCalled();
    expect(firstResponse.status).toHaveBeenCalledWith(201);
    expect(secondResponse.status).toHaveBeenCalledWith(201);
    expect(firstResponse.json).toHaveBeenCalledWith({
      user: {
        id: "staff-1",
        name: "Alice",
        email: "alice@example.com",
        role: "staff",
      },
      condominium: {
        id: "condo-1",
        name: "Condominio Teste",
        code: "ABC123",
      },
    });
    expect(secondResponse.json).toHaveBeenCalledWith({
      user: {
        id: "staff-2",
        name: "Bob",
        email: "bob@example.com",
        role: "staff",
      },
      condominium: {
        id: "condo-1",
        name: "Condominio Teste",
        code: "ABC123",
      },
    });
  });
});
