import {
  createInvitePasswordSetup,
  isInviteExpired,
} from "@/services/invites/invite-signup";

describe("invite-signup", () => {
  describe("isInviteExpired", () => {
    it("returns true when the expiry is before the current time", () => {
      const now = new Date("2026-03-25T12:00:00.000Z");
      const expiresAt = new Date("2026-03-25T11:59:59.000Z");

      expect(isInviteExpired(expiresAt, now)).toBe(true);
    });

    it("returns false when the invite is still valid", () => {
      const now = new Date("2026-03-25T12:00:00.000Z");
      const expiresAt = new Date("2026-03-25T12:00:00.000Z");

      expect(isInviteExpired(expiresAt, now)).toBe(false);
    });
  });

  describe("createInvitePasswordSetup", () => {
    it("returns null when a password is already provided", () => {
      const result = createInvitePasswordSetup("already-set");

      expect(result).toBeNull();
    });

    it("creates a one-hour setup token payload when password is missing", () => {
      const now = new Date("2026-03-25T12:00:00.000Z");
      const result = createInvitePasswordSetup(undefined, now);

      expect(result).not.toBeNull();
      expect(result?.token).toHaveLength(64);
      expect(result?.tokenHash).not.toEqual(result?.token);
      expect(result?.expiresAt.toISOString()).toBe("2026-03-25T13:00:00.000Z");
    });
  });
});
