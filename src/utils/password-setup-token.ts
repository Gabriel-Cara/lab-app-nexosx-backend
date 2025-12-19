import crypto from "crypto";

export function generateSetupToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSetupToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
