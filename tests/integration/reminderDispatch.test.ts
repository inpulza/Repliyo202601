import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ABANDONED_REMINDER_CLAIM_REASON } from "../../server/services/reminderDispatchService";
import {
  createReminderDispatchHarness,
  createReminderEvent,
} from "../helpers/reminderDispatchTestServer";

describe("reminder dispatch idempotency", () => {
  it("allows only one delivery when two workers race for the same reminder", async () => {
    const harness = createReminderDispatchHarness();

    const result = await harness.dispatchConcurrently(2);

    assert.equal(result.deliveryCount, 1);
    assert.equal(result.results.reduce((sum, worker) => sum + worker.sent, 0), 1);
    assert.deepEqual(result.statuses, ["sent"]);
    assert.deepEqual(result.results.flatMap((worker) => worker.errors), []);
  });

  it("does not deliver a sent reminder again on a later cycle", async () => {
    const harness = createReminderDispatchHarness();

    assert.deepEqual(await harness.dispatchOnce(), { sent: 1, errors: [] });
    assert.deepEqual(await harness.dispatchOnce(), { sent: 0, errors: [] });
    assert.equal(harness.deliveryCount, 1);
  });

  it("fails an abandoned claim without retrying an ambiguous delivery", async () => {
    const harness = createReminderDispatchHarness([
      createReminderEvent({
        status: "processing",
        processingStartedAt: new Date("2026-08-05T11:30:00.000Z"),
      }),
    ]);

    const result = await harness.dispatchOnce();

    assert.deepEqual(result, { sent: 0, errors: [] });
    assert.equal(harness.deliveryCount, 0);
    assert.equal(harness.events[0].status, "failed");
    assert.equal(harness.events[0].errorMessage, ABANDONED_REMINDER_CLAIM_REASON);
  });

  it("leaves a fresh in-flight claim alone", async () => {
    const harness = createReminderDispatchHarness([
      createReminderEvent({
        status: "processing",
        processingStartedAt: new Date("2026-08-05T11:50:00.001Z"),
      }),
    ]);

    const result = await harness.dispatchOnce();

    assert.deepEqual(result, { sent: 0, errors: [] });
    assert.equal(harness.deliveryCount, 0);
    assert.equal(harness.events[0].status, "processing");
    assert.equal(harness.events[0].errorMessage, null);
  });
});
