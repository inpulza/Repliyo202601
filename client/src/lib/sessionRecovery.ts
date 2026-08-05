export const AUTHORIZATION_RELOAD_GUARD_KEY = "repliyo_authorization_reload_attempted";

const TERMINAL_SESSION_CODES = new Set([
  "ACCOUNT_INACTIVE",
  "ACCOUNT_SUSPENDED",
  "BRAND_UNAVAILABLE",
]);

export type WebSocketAuthorizationRecovery = "reload" | "login";

export async function isTerminalSessionResponse(response: Response): Promise<boolean> {
  if (response.status === 401) return true;
  if (response.status !== 403) return false;

  try {
    const payload = await response.clone().json() as { code?: unknown };
    return typeof payload.code === "string" && TERMINAL_SESSION_CODES.has(payload.code);
  } catch {
    return false;
  }
}

export function isDashboardPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export function getWebSocketAuthorizationRecovery(
  reloadAlreadyAttempted: boolean,
): WebSocketAuthorizationRecovery {
  return reloadAlreadyAttempted ? "login" : "reload";
}
