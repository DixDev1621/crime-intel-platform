import jwt, { SignOptions } from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  role: string;
  badgeNumber: string;
}

const SECRET = process.env.JWT_SECRET as string;
const EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "8h") as SignOptions["expiresIn"];

if (!SECRET) {
  // Fail fast rather than silently signing tokens with `undefined`.
  throw new Error("JWT_SECRET is not set. Copy .env.example to .env and set it.");
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
