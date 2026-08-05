import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getWebSocketAuthorizationRecovery,
  isDashboardPath,
  isTerminalSessionResponse,
} from "../../client/src/lib/sessionRecovery";

describe("terminal dashboard session responses", () => {
  it("ends an explicitly unauthenticated session on 401", async () => {
    const response = Response.json({ code: "NOT_AUTHENTICATED" }, { status: 401 });
    assert.equal(await isTerminalSessionResponse(response), true);
    assert.deepEqual(
      await response.json(),
      { code: "NOT_AUTHENTICATED" },
      "inspection must not consume the response body",
    );
  });

  for (const code of ["ACCOUNT_INACTIVE", "ACCOUNT_SUSPENDED", "BRAND_UNAVAILABLE"]) {
    it(`ends a session for ${code}`, async () => {
      const response = Response.json({ code }, { status: 403 });
      assert.equal(await isTerminalSessionResponse(response), true);
      assert.deepEqual(await response.json(), { code }, "inspection must not consume the response body");
    });
  }

  it("preserves the session for non-terminal 401 responses", async () => {
    assert.equal(
      await isTerminalSessionResponse(Response.json({ code: "INVALID_CURRENT_PASSWORD" }, { status: 401 })),
      false,
    );
    assert.equal(await isTerminalSessionResponse(new Response(null, { status: 401 })), false);
  });

  it("preserves the session for ordinary permission failures and malformed bodies", async () => {
    assert.equal(
      await isTerminalSessionResponse(Response.json({ error: "Admin access required" }, { status: 403 })),
      false,
    );
    assert.equal(
      await isTerminalSessionResponse(new Response("Forbidden", { status: 403 })),
      false,
    );
  });

  it("only installs dashboard-wide recovery under /app", () => {
    assert.equal(isDashboardPath("/app"), true);
    assert.equal(isDashboardPath("/app/profile"), true);
    assert.equal(isDashboardPath("/login"), false);
    assert.equal(isDashboardPath("/application"), false);
  });
});

describe("WebSocket authorization recovery", () => {
  it("allows one refresh before falling back to login", () => {
    assert.equal(getWebSocketAuthorizationRecovery(false), "reload");
    assert.equal(getWebSocketAuthorizationRecovery(true), "login");
  });
});
