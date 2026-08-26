/**
 * Classifier for transient network failures on Neon's WebSocket transport.
 *
 * The serverless driver talks to Postgres over a WebSocket that the provider
 * drops intermittently (ECONNRESET / "socket hang up" / "WebSocket was
 * closed"). Those failures do not surface inside an application try/catch:
 * they reach `uncaughtException` / `unhandledRejection` and terminate the
 * whole process, which the user experiences as the app shutting down on its
 * own. `server/db.ts` uses this predicate to absorb exactly those errors and
 * keep serving; the pool opens a fresh connection on the next query.
 *
 * This lives in its own module on purpose: `server/db.ts` constructs a Pool
 * and requires DATABASE_URL at import time, so the predicate could not be
 * unit-tested from there without opening a real connection.
 */

interface SocketErrorShape {
  code?: string;
  message?: string;
  type?: string;
  error?: { code?: string } | null;
}

const TRANSIENT_SOCKET_CODES = new Set(["ECONNRESET", "EPIPE", "ETIMEDOUT"]);

const TRANSIENT_SOCKET_MESSAGES = ["socket hang up", "WebSocket was closed"];

export function isTransientSocketError(reason: unknown): boolean {
  if (!reason || typeof reason !== "object") return false;

  const err = reason as SocketErrorShape;
  const code = err.code ?? err.error?.code;
  const message = typeof err.message === "string" ? err.message : "";

  if (typeof code === "string" && TRANSIENT_SOCKET_CODES.has(code)) return true;
  if (TRANSIENT_SOCKET_MESSAGES.some((fragment) => message.includes(fragment))) return true;

  // ws ErrorEvent wrapping a socket error (Neon serverless driver). This is the
  // loosest branch: it matches any ErrorEvent carrying a nested error, because
  // the driver does not consistently expose a code on the wrapper. Narrowing it
  // must be validated against a real Neon drop before shipping.
  return err.type === "error" && typeof err.error === "object" && err.error !== null;
}
