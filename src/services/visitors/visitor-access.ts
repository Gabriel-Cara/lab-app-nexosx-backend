import { AppError } from "@/utils/app-error";

type AuthenticatedUser = {
  id: string;
  role: string;
};

export function getResidentVisitScope(user: AuthenticatedUser) {
  return user.role === "resident" ? { hostId: user.id } : {};
}

export function resolveVisitHostId(
  user: AuthenticatedUser,
  requestedHostId: string,
) {
  if (user.role === "resident" && requestedHostId !== user.id) {
    throw new AppError("Unauthorized", 403);
  }

  return user.role === "resident" ? user.id : requestedHostId;
}
