import {
  isDashboardPath,
  isTerminalSessionResponse,
} from "@/lib/sessionRecovery";

type FetchInput = RequestInfo | URL;
type FetchLike = (input: FetchInput, init?: RequestInit) => Promise<Response>;

interface ApiClientLocation {
  origin: string;
  pathname: string;
}

interface ApiFetchOptions {
  fetchImpl: FetchLike;
  getLocation: () => ApiClientLocation;
  onTerminalSession: () => void;
}

let dashboardSessionEndHandler: (() => void) | null = null;

export function registerDashboardSessionEndHandler(handler: () => void): () => void {
  dashboardSessionEndHandler = handler;

  return () => {
    if (dashboardSessionEndHandler === handler) {
      dashboardSessionEndHandler = null;
    }
  };
}

export function isFirstPartyApiRequest(input: FetchInput, currentOrigin: string): boolean {
  const inputUrl = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

  try {
    const requestUrl = new URL(inputUrl, currentOrigin);
    return requestUrl.origin === currentOrigin
      && (requestUrl.pathname === "/api" || requestUrl.pathname.startsWith("/api/"));
  } catch {
    return false;
  }
}

export function createApiFetch({
  fetchImpl,
  getLocation,
  onTerminalSession,
}: ApiFetchOptions): FetchLike {
  return async (input, init) => {
    const response = await fetchImpl(input, init);
    const location = getLocation();

    if (
      isDashboardPath(location.pathname)
      && isFirstPartyApiRequest(input, location.origin)
      && await isTerminalSessionResponse(response)
    ) {
      onTerminalSession();
    }

    return response;
  };
}

export const apiFetch = createApiFetch({
  fetchImpl: (input, init) => globalThis.fetch(input, init),
  getLocation: () => ({
    origin: window.location.origin,
    pathname: window.location.pathname,
  }),
  onTerminalSession: () => dashboardSessionEndHandler?.(),
});
