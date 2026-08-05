import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { User } from "@shared/schema";
import { evaluateSessionAccess } from "../../server/security/sessionAccess";

describe("active session access", () => {
  it("allows an active client of an active brand", () => {
    assert.deepEqual(
      evaluateSessionAccess({ user: user(), brandStatus: "active" }),
      { allowed: true },
    );
  });

  it("revokes a suspended user even when the session still exists", () => {
    const decision = evaluateSessionAccess({
      user: user({ status: "suspended" }),
      brandStatus: "active",
    });

    assert.equal(decision.allowed, false);
    if (!decision.allowed) assert.equal(decision.code, "ACCOUNT_SUSPENDED");
  });

  it("revokes a client whose assigned brand is archived", () => {
    const decision = evaluateSessionAccess({
      user: user(),
      brandStatus: "archived",
    });

    assert.equal(decision.allowed, false);
    if (!decision.allowed) assert.equal(decision.code, "BRAND_UNAVAILABLE");
  });

  it("revokes a pending account", () => {
    const decision = evaluateSessionAccess({
      user: user({ status: "pending" }),
      brandStatus: "active",
    });

    assert.equal(decision.allowed, false);
    if (!decision.allowed) assert.equal(decision.code, "ACCOUNT_INACTIVE");
  });

  it("allows an active non-admin while it awaits a brand assignment", () => {
    assert.deepEqual(
      evaluateSessionAccess({
        user: user({ brandId: null }),
        brandStatus: null,
      }),
      { allowed: true },
    );
  });

  it("preserves administrator access independently of brand status", () => {
    assert.deepEqual(
      evaluateSessionAccess({
        user: user({ role: "admin", brandId: null }),
        brandStatus: null,
      }),
      { allowed: true },
    );
  });
});

function user(overrides: Partial<User> = {}): User {
  return {
    id: "user-a",
    email: "client-a@example.test",
    password: null,
    name: "Client A",
    role: "client",
    brandId: "brand-a",
    replitId: null,
    profileImageUrl: null,
    authProvider: "local",
    status: "active",
    emailVerifiedAt: new Date("2026-08-05T00:00:00.000Z"),
    createdAt: new Date("2026-08-05T00:00:00.000Z"),
    ...overrides,
  };
}
