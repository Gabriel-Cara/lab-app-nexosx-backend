import { sign, verify } from "jsonwebtoken";
import { env } from "@/env";

export interface JwtPayload {
  sub: string;
  role: string;
}

export const signToken = (payload: JwtPayload) => {
  return sign(payload, env.JWT_SECRET, { expiresIn: "8h" });
};

export const verifyToken = (token: string) => {
  return verify(token, env.JWT_SECRET) as JwtPayload & { iat: number; exp: number };
};
