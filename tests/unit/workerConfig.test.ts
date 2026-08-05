import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveWorkerConfig } from "../../server/workerConfig";

describe("background worker configuration", () => {
  it("keeps existing deployments enabled by default", () => {
    assert.deepEqual(resolveWorkerConfig({}), {
      syncEnabled: true,
      lifecycleEnabled: true,
    });
  });

  it("can disable all background work on web-only replicas", () => {
    assert.deepEqual(resolveWorkerConfig({ BACKGROUND_WORKERS_ENABLED: "0" }), {
      syncEnabled: false,
      lifecycleEnabled: false,
    });
  });

  it("allows an explicit worker to override the global switch", () => {
    assert.deepEqual(
      resolveWorkerConfig({
        BACKGROUND_WORKERS_ENABLED: "false",
        LIFECYCLE_WORKER_ENABLED: "yes",
      }),
      {
        syncEnabled: false,
        lifecycleEnabled: true,
      },
    );
  });

  it("rejects ambiguous values instead of silently enabling a worker", () => {
    assert.throws(
      () => resolveWorkerConfig({ SYNC_WORKER_ENABLED: "sometimes" }),
      /SYNC_WORKER_ENABLED/,
    );
  });
});
