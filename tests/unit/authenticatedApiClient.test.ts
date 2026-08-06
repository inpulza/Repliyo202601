import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createApiFetch,
  isFirstPartyApiRequest,
} from "../../client/src/lib/authenticatedApiClient";

const DASHBOARD_LOCATION = {
  origin: "https://app.repliyo.test",
  pathname: "/app/profile",
};

describe("first-party authenticated API boundary", () => {
  it("recognizes only same-origin /api requests", () => {
    assert.equal(isFirstPartyApiRequest("/api/auth/me", DASHBOARD_LOCATION.origin), true);
    assert.equal(isFirstPartyApiRequest("/api?health=1", DASHBOARD_LOCATION.origin), true);
    assert.equal(
      isFirstPartyApiRequest(
        new Request("https://app.repliyo.test/api/brands"),
        DASHBOARD_LOCATION.origin,
      ),
      true,
    );
    assert.equal(
      isFirstPartyApiRequest("https://third-party.test/api/auth/me", DASHBOARD_LOCATION.origin),
      false,
    );
    assert.equal(isFirstPartyApiRequest("/apiary/status", DASHBOARD_LOCATION.origin), false);
    assert.equal(isFirstPartyApiRequest("/assets/app.js", DASHBOARD_LOCATION.origin), false);
  });

  it("ends a dashboard session without consuming the terminal response", async () => {
    let terminalSessions = 0;
    const apiFetch = createApiFetch({
      fetchImpl: async () => Response.json(
        { code: "NOT_AUTHENTICATED", message: "Sign in again" },
        { status: 401 },
      ),
      getLocation: () => DASHBOARD_LOCATION,
      onTerminalSession: () => {
        terminalSessions += 1;
      },
    });

    const response = await apiFetch("/api/auth/me");

    assert.equal(terminalSessions, 1);
    assert.deepEqual(await response.json(), {
      code: "NOT_AUTHENTICATED",
      message: "Sign in again",
    });
  });

  it("preserves ordinary validation errors for the caller", async () => {
    let terminalSessions = 0;
    const apiFetch = createApiFetch({
      fetchImpl: async () => Response.json(
        { code: "INVALID_CURRENT_PASSWORD", message: "Wrong password" },
        { status: 400 },
      ),
      getLocation: () => DASHBOARD_LOCATION,
      onTerminalSession: () => {
        terminalSessions += 1;
      },
    });

    const response = await apiFetch("/api/auth/change-password", { method: "POST" });

    assert.equal(terminalSessions, 0);
    assert.deepEqual(await response.json(), {
      code: "INVALID_CURRENT_PASSWORD",
      message: "Wrong password",
    });
  });

  it("ignores terminal-shaped responses outside the dashboard API boundary", async () => {
    let terminalSessions = 0;
    const apiFetch = createApiFetch({
      fetchImpl: async () => Response.json({ code: "NOT_AUTHENTICATED" }, { status: 401 }),
      getLocation: () => DASHBOARD_LOCATION,
      onTerminalSession: () => {
        terminalSessions += 1;
      },
    });

    await apiFetch("https://third-party.test/api/auth/me");
    await apiFetch("/assets/private.json");

    const publicApiFetch = createApiFetch({
      fetchImpl: async () => Response.json({ code: "NOT_AUTHENTICATED" }, { status: 401 }),
      getLocation: () => ({ ...DASHBOARD_LOCATION, pathname: "/login" }),
      onTerminalSession: () => {
        terminalSessions += 1;
      },
    });
    await publicApiFetch("/api/auth/me");

    assert.equal(terminalSessions, 0);
  });

  it("forwards uploads, credentials and cancellation without rewriting them", async () => {
    const formData = new FormData();
    formData.set("attachment", new Blob(["hello"], { type: "text/plain" }), "hello.txt");
    const controller = new AbortController();
    const requestInit: RequestInit = {
      method: "POST",
      body: formData,
      credentials: "include",
      signal: controller.signal,
    };
    const abortError = new DOMException("Request aborted", "AbortError");

    const apiFetch = createApiFetch({
      fetchImpl: async (input, init) => {
        assert.equal(input, "/api/uploads");
        assert.equal(init, requestInit);
        throw abortError;
      },
      getLocation: () => DASHBOARD_LOCATION,
      onTerminalSession: () => assert.fail("an aborted request must not end the session"),
    });

    await assert.rejects(() => apiFetch("/api/uploads", requestInit), (error) => error === abortError);
  });
});
