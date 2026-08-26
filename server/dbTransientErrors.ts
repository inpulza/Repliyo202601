/**
 * Guard for transient network failures on Neon's WebSocket transport.
 *
 * The serverless driver talks to Postgres over a WebSocket that the provider
 * drops intermittently (ECONNRESET / "socket hang up" / "WebSocket was
 * closed"). Those failures do not surface inside an application try/catch:
 * they reach `uncaughtException` / `unhandledRejection` and terminate the
 * whole process, which the user experiences as the app shutting down on its
 * own. The guard absorbs exactly those and lets the pool open a fresh
 * connection on the next query; everything else stays fatal.
 *
 * This lives in its own module on purpose: `server/db.ts` constructs a Pool
 * and requires DATABASE_URL at import time, so neither the predicate nor the
 * handlers could be tested from there without opening a real connection.
 */

const TRANSIENT_SOCKET_CODES = new Set(["ECONNRESET", "EPIPE", "ETIMEDOUT"]);

const TRANSIENT_SOCKET_MESSAGES = ["socket hang up", "WebSocket was closed"];

/** ws wraps the real socket error one level down (ErrorEvent.error). */
const MAX_NESTING_DEPTH = 2;

function hasTransientEvidence(value: unknown, depth: number): boolean {
  if (!value || typeof value !== "object" || depth > MAX_NESTING_DEPTH) return false;

  const candidate = value as { code?: unknown; message?: unknown; error?: unknown };

  if (typeof candidate.code === "string" && TRANSIENT_SOCKET_CODES.has(candidate.code)) {
    return true;
  }

  if (typeof candidate.message === "string") {
    const message = candidate.message;
    if (TRANSIENT_SOCKET_MESSAGES.some((fragment) => message.includes(fragment))) return true;
  }

  // A ws ErrorEvent carries the underlying socket error in `error`. Only the
  // nested evidence counts: an ErrorEvent on its own proves nothing about the
  // transport, and treating it as transient would swallow real bugs.
  return hasTransientEvidence(candidate.error, depth + 1);
}

export function isTransientSocketError(reason: unknown): boolean {
  return hasTransientEvidence(reason, 0);
}

function describe(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === "object" && typeof (reason as { message?: unknown }).message === "string") {
    return (reason as { message: string }).message;
  }
  return String(reason);
}

/** Minimal surface of `process` the guard needs, so tests can inject a double. */
export interface TransientGuardTarget {
  on(event: string, listener: (reason: unknown) => void): unknown;
  exit(code: number): unknown;
}

/**
 * Absorb transient socket failures and keep the fatal path fatal.
 *
 * Rethrowing from an `uncaughtException` listener does NOT reproduce Node's
 * default behaviour: Node treats it as a failure inside the handler and exits
 * with code 7 instead of 1. The handler therefore reports the error and exits
 * explicitly with 1, which is what supervisors and CI expect.
 */
export function registerTransientSocketGuards(
  target: TransientGuardTarget = process,
  log: (...args: unknown[]) => void = console.error,
): void {
  target.on("uncaughtException", (err: unknown) => {
    if (isTransientSocketError(err)) {
      log("[db] Transient socket error (recovered):", describe(err));
      return;
    }
    log("[db] Fatal uncaught exception:", err);
    target.exit(1);
  });

  target.on("unhandledRejection", (reason: unknown) => {
    if (isTransientSocketError(reason)) {
      log("[db] Transient socket rejection (recovered):", describe(reason));
      return;
    }
    log("[db] Fatal unhandled rejection:", reason);
    target.exit(1);
  });
}
