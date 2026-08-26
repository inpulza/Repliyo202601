import test from "node:test";
import assert from "node:assert/strict";

import {
  RECONCILIATION_MAX_TOLERANCE_MS,
  reconciliationTimestamp,
  reconciliationWindow,
} from "../../server/reconciliationWindow";
import { verboseSyncLogsEnabled } from "../../server/syncLogging";

const HOUR_MS = 60 * 60 * 1000;

test("the window covers every tolerance the matchers apply", () => {
  // Mirrors the tolerances hardcoded in storage.ts. If one of them grows past
  // the window, the SQL would stop returning candidates the matcher would have
  // accepted, and reconciliation would start creating duplicates instead.
  const longMessageTolerance = 2 * HOUR_MS;
  const shortMessageTolerance = 10 * 60 * 1000;
  const fallbackTolerance = 5 * 60 * 1000;
  const globalMatcherTolerance = 2 * HOUR_MS;

  for (const tolerance of [
    longMessageTolerance,
    shortMessageTolerance,
    fallbackTolerance,
    globalMatcherTolerance,
  ]) {
    assert.ok(
      tolerance <= RECONCILIATION_MAX_TOLERANCE_MS,
      `tolerance ${tolerance}ms exceeds the query window ${RECONCILIATION_MAX_TOLERANCE_MS}ms`,
    );
  }
});

test("window is symmetric around the reference instant", () => {
  const reference = Date.parse("2026-08-26T12:00:00.000Z");
  const { from, to } = reconciliationWindow(reference);

  assert.equal(from.toISOString(), "2026-08-26T10:00:00.000Z");
  assert.equal(to.toISOString(), "2026-08-26T14:00:00.000Z");
});

test("a candidate exactly at the tolerance edge is still inside the window", () => {
  const reference = Date.parse("2026-08-26T12:00:00.000Z");
  const { from, to } = reconciliationWindow(reference);
  const twoHoursEarlier = new Date(reference - 2 * HOUR_MS);
  const twoHoursLater = new Date(reference + 2 * HOUR_MS);

  assert.ok(from.getTime() <= twoHoursEarlier.getTime());
  assert.ok(to.getTime() >= twoHoursLater.getTime());
});

test("timestamps are parsed from Date, string and epoch alike", () => {
  const expected = Date.parse("2026-08-26T12:00:00.000Z");

  assert.equal(reconciliationTimestamp(new Date(expected)), expected);
  assert.equal(reconciliationTimestamp("2026-08-26T12:00:00.000Z"), expected);
  assert.equal(reconciliationTimestamp(expected), expected);
});

test("missing timestamp falls back to now", () => {
  const now = () => 1234;

  assert.equal(reconciliationTimestamp(null, now), 1234);
  assert.equal(reconciliationTimestamp(undefined, now), 1234);
  assert.equal(reconciliationTimestamp("", now), 1234);
});

test("unparseable timestamp is ineligible, never silently treated as now", () => {
  const now = () => 5678;

  // Before the window existed, an invalid date made every timeDiff comparison
  // false, so such a message could never reconcile. Falling back to the current
  // time would let a corrupt old message match a recent one; passing it through
  // would send `Invalid Date` to Postgres. Callers must skip reconciliation.
  assert.equal(reconciliationTimestamp("not a date", now), null);
  assert.equal(reconciliationTimestamp(new Date("nope"), now), null);
  assert.equal(reconciliationTimestamp(Number.NaN, now), null);
});

test("verbose sync logging is off unless explicitly enabled", () => {
  assert.equal(verboseSyncLogsEnabled({}), false);
  assert.equal(verboseSyncLogsEnabled({ SYNC_VERBOSE_LOGS: "0" }), false);
  assert.equal(verboseSyncLogsEnabled({ SYNC_VERBOSE_LOGS: "" }), false);
  assert.equal(verboseSyncLogsEnabled({ SYNC_VERBOSE_LOGS: "yes" }), false);

  assert.equal(verboseSyncLogsEnabled({ SYNC_VERBOSE_LOGS: "1" }), true);
  assert.equal(verboseSyncLogsEnabled({ SYNC_VERBOSE_LOGS: "true" }), true);
});
