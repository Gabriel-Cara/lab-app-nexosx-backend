import { NextFunction, Request, Response } from "express";
import { verifyToken } from "@/configs/token";
import { AppError } from "@/utils/app-error";

const authenticate = (
  request: Request,
  _: Response,
  next: NextFunction
) => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new AppError("JWT token not found", 401);
    }

    const [scheme, token] = authHeader.split(" ");

    if (!token || scheme?.toLowerCase() !== "bearer") {
      throw new AppError("Invalid JWT token", 401);
    }

    const payload = verifyToken(token);

    request.user = {
      id: payload.sub,
      role: payload.role
    };

    return next();
  } catch (error) {
    throw new AppError("Invalid JWT token", 401);
  }
};

const authorize = (roles: string[]) => {
  return (request: Request, _: Response, next: NextFunction) => {
    if (!request.user) {
      throw new AppError("Unauthorized", 401);
    }

    if (!roles.includes(request.user.role)) {
      throw new AppError("Unauthorized", 401);
    }

    return next();
  };
};

export { authenticate, authorize}
