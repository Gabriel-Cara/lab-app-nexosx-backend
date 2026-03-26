import type { VisitorStatus } from "@prisma/client";

export function getInitialVisitStatus(
  unlimitedAccess: boolean,
): VisitorStatus {
  return unlimitedAccess ? "authorized" : "pending";
}

export function normalizeAllowedHours(
  unlimitedAccess: boolean,
  allowedHours: number | null | undefined,
) {
  return unlimitedAccess ? null : allowedHours ?? null;
}

export function getExpectedExitTime(
  allowedHours: number | null | undefined,
  entryTime = new Date(),
) {
  if (!allowedHours) {
    return null;
  }

  return new Date(entryTime.getTime() + allowedHours * 60 * 60 * 1000);
}
