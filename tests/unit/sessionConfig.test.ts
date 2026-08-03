import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isProductionEnvironment,
  isReplitEnvironment,
  resolveSessionSecret,
} from "../../server/sessionConfig";

describe("session configuration", () => {
  it("uses one deterministic local secret outside production", () => {
    const env = { NODE_ENV: "development" } as NodeJS.ProcessEnv;

    assert.equal(resolveSessionSecret(env), "dev-secret-for-local-only");
    assert.equal(isProductionEnvironment(env), false);
  });

  it("requires an explicit secret in production", () => {
    const env = { NODE_ENV: "production" } as NodeJS.ProcessEnv;

    assert.throws(() => resolveSessionSecret(env), /SESSION_SECRET/);
  });

  it("treats Replit as production-like", () => {
    const env = { REPL_ID: "repl-test" } as NodeJS.ProcessEnv;

    assert.equal(isReplitEnvironment(env), true);
    assert.equal(isProductionEnvironment(env), true);
    assert.throws(() => resolveSessionSecret(env), /SESSION_SECRET/);
  });

  it("returns the configured secret in every environment", () => {
    const env = {
      NODE_ENV: "production",
      SESSION_SECRET: "configured-test-secret",
    } as NodeJS.ProcessEnv;

    assert.equal(resolveSessionSecret(env), "configured-test-secret");
  });
});
