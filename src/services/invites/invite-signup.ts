import {
  generateSetupToken,
  hashSetupToken,
} from "@/utils/password-setup-token";

const INVITE_SETUP_TOKEN_TTL_MS = 60 * 60 * 1000;

export type InvitePasswordSetup = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export function isInviteExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() < now.getTime();
}

export function createInvitePasswordSetup(
  password: string | undefined,
  now = new Date(),
): InvitePasswordSetup | null {
  if (password) {
    return null;
  }

  const token = generateSetupToken();

  return {
    token,
    tokenHash: hashSetupToken(token),
    expiresAt: new Date(now.getTime() + INVITE_SETUP_TOKEN_TTL_MS),
  };
}
