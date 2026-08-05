import type { User } from "@shared/schema";

export interface SessionAccessRecord {
  user: User;
  brandStatus: string | null;
}

export type SessionAccessDecision =
  | { allowed: true }
  | {
      allowed: false;
      code: "ACCOUNT_INACTIVE" | "ACCOUNT_SUSPENDED" | "BRAND_UNAVAILABLE";
      error: string;
      message: string;
    };

export function evaluateSessionAccess(
  record: SessionAccessRecord,
): SessionAccessDecision {
  if (record.user.status === "suspended") {
    return {
      allowed: false,
      code: "ACCOUNT_SUSPENDED",
      error: "Account suspended",
      message: "Tu cuenta ha sido suspendida. Contacta al administrador.",
    };
  }

  if (record.user.status !== "active") {
    return {
      allowed: false,
      code: "ACCOUNT_INACTIVE",
      error: "Account inactive",
      message: "Tu cuenta no está activa. Contacta al administrador.",
    };
  }

  if (
    record.user.role !== "admin" &&
    record.user.brandId &&
    record.brandStatus !== "active"
  ) {
    return {
      allowed: false,
      code: "BRAND_UNAVAILABLE",
      error: "Brand unavailable",
      message: "Esta marca no está disponible. Contacta al administrador.",
    };
  }

  return { allowed: true };
}
