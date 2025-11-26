import bcrypt from "bcrypt";
import type { User, Brand } from "@shared/schema";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export interface AuthenticatedUser extends User {
  password?: never;
}

export function sanitizeUser(user: User): AuthenticatedUser {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
}

export interface SanitizedBrand extends Omit<Brand, 'metricoolToken' | 'metricoolUserId'> {
  metricoolToken?: never;
  metricoolUserId?: never;
}

export function sanitizeBrand(brand: Brand): SanitizedBrand {
  const { metricoolToken, metricoolUserId, ...sanitizedBrand } = brand;
  return sanitizedBrand;
}
