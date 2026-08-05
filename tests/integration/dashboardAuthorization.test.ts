import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import {
  startDashboardAuthorizationTestServer,
  type DashboardAuthorizationTestServer,
} from "../helpers/dashboardAuthorizationTestServer";

let server: DashboardAuthorizationTestServer;

before(async () => {
  server = await startDashboardAuthorizationTestServer();
});

beforeEach(() => server.reset());
after(async () => server.close());

describe("active dashboard sessions", () => {
  it("revokes an already-open session after the user is suspended", async () => {
    const response = await request("/api/auth/me", "suspended-a");

    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "ACCOUNT_SUSPENDED");
    assert.equal(server.state.sessionRevocations, 1);
  });

  it("revokes a client session when its brand is archived", async () => {
    const response = await request("/api/auth/me", "archived-user");

    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "BRAND_UNAVAILABLE");
    assert.equal(server.state.sessionRevocations, 1);
  });

  it("keeps an active session working", async () => {
    const response = await request("/api/auth/me", "user-a");

    assert.equal(response.status, 200);
    assert.equal((await response.json()).id, "user-a");
    assert.equal(server.state.sessionRevocations, 0);
  });

  it("labels a missing stored user as an unauthenticated session", async () => {
    const response = await request("/api/auth/me", "missing-user");

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "User not found",
      code: "NOT_AUTHENTICATED",
    });
    assert.equal(server.state.sessionRevocations, 1);
  });

  it("keeps the session active when the current password is incorrect", async () => {
    const response = await request("/api/auth/change-password", "user-a", {
      method: "POST",
      body: {
        currentPassword: "wrong-password",
        newPassword: "new-password",
      },
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "La contraseña actual es incorrecta",
      code: "INVALID_CURRENT_PASSWORD",
    });
    assert.equal(server.state.sessionRevocations, 0);
  });
});

describe("brand-scoped notification mutations", () => {
  it("marks an own-brand notification through a brand-scoped write", async () => {
    const response = await request("/api/notifications/notification-a/read", "user-a", {
      method: "PATCH",
      body: { brandId: "brand-a" },
    });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).isRead, true);
    assert.equal(server.state.notificationWrites, 1);
  });

  it("hides a foreign notification and performs no write", async () => {
    const response = await request("/api/notifications/notification-b/read", "user-a", {
      method: "PATCH",
      body: { brandId: "brand-a" },
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Notification not found" });
    assert.equal(server.state.notificationWrites, 0);
  });

  it("does not trust a client-supplied foreign brand", async () => {
    const response = await request("/api/notifications/notification-b/read", "user-a", {
      method: "PATCH",
      body: { brandId: "brand-b" },
    });

    assert.equal(response.status, 404);
    assert.equal(server.state.notificationWrites, 0);
  });
});

describe("brand-scoped conversation assignments", () => {
  it("assigns an own-brand conversation to an active own-brand user", async () => {
    const response = await request("/api/conversations/conversation-a/assign", "user-a", {
      method: "POST",
      body: { userId: "agent-a" },
    });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).conversation.assignedToUserId, "agent-a");
    assert.equal(server.state.assignmentWrites, 1);
  });

  it("rejects a foreign or suspended assignee before any write", async () => {
    for (const userId of ["user-b", "suspended-a"]) {
      server.reset();
      const response = await request("/api/conversations/conversation-a/assign", "user-a", {
        method: "POST",
        body: { userId },
      });

      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: "Assignee not found" });
      assert.equal(server.state.assignmentWrites, 0);
    }
  });

  it("fails closed when assignee eligibility changes before the final write", async () => {
    const response = await request("/api/conversations/conversation-a/assign", "user-a", {
      method: "POST",
      body: { userId: "stale-agent-a" },
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Assignee not found" });
    assert.equal(server.state.assignmentWrites, 0);
  });

  it("rejects a malformed assignment payload", async () => {
    const response = await request("/api/conversations/conversation-a/assign", "user-a", {
      method: "POST",
      body: { userId: "agent-a", unexpected: true },
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid assignment data" });
    assert.equal(server.state.assignmentWrites, 0);
  });

  it("hides a foreign conversation before assignment", async () => {
    const response = await request("/api/conversations/conversation-b/assign", "user-a", {
      method: "POST",
      body: { userId: "user-b" },
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Conversation not found" });
    assert.equal(server.state.assignmentWrites, 0);
  });
});

function request(
  path: string,
  userId: string,
  options: { method?: string; body?: unknown } = {},
): Promise<Response> {
  return fetch(`${server.baseUrl}${path}`, {
    method: options.method,
    headers: {
      "content-type": "application/json",
      "x-test-user-id": userId,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}
