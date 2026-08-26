import type { Message } from "@shared/schema";

/**
 * The columns the reconciliation matchers actually read.
 *
 * Selecting the full row pulled `raw_data` (a jsonb blob holding the entire
 * Metricool conversation) for every candidate, which dominated the cost of the
 * query while never being looked at.
 */
export type ReconciliationCandidate = Pick<
  Message,
  "id" | "conversationId" | "content" | "timestamp" | "source" | "authorAvatar" | "internalOrigin"
>;

/**
 * Bounds for the reconciliation matchers in `storage.ts`.
 *
 * Reconciliation compares a freshly synced message against messages Repliyo
 * sent itself, so it can update the local copy instead of creating a
 * duplicate. Every accept branch in both matchers requires the two timestamps
 * to be within a tolerance, and the widest tolerance in use is two hours.
 *
 * A candidate outside that window therefore cannot match, no matter what its
 * content is. Bounding the SQL by the window is what keeps the matchers from
 * loading the whole table on every synced message.
 *
 * If a matcher ever needs a tolerance wider than
 * `RECONCILIATION_MAX_TOLERANCE_MS`, this constant must grow with it or the
 * query will silently stop returning candidates it used to accept. The unit
 * tests assert that relationship.
 */
export const RECONCILIATION_MAX_TOLERANCE_MS = 2 * 60 * 60 * 1000;

/**
 * Resolve the reference instant of a synced message.
 *
 * A missing timestamp falls back to the current time, which is exactly what
 * the matchers did before the window existed.
 *
 * An unparseable timestamp returns `null`, meaning "not eligible for
 * reconciliation", and the caller must skip the lookup entirely. It
 * deliberately does NOT fall back to the current time: every `timeDiff`
 * comparison against `NaN` used to be false, so a malformed timestamp could
 * never match anything. Substituting the current time would let a corrupt old
 * message suddenly reconcile against a recent one — and the invalid date would
 * reach Postgres and break the query besides.
 */
export function reconciliationTimestamp(
  value: Date | string | number | null | undefined,
  now: () => number = Date.now,
): number | null {
  if (value === null || value === undefined || value === "") {
    return now();
  }

  const parsed = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Inclusive time range a reconciliation candidate must fall in to be worth
 * loading. Symmetric around the reference instant: the synced message can
 * arrive either before or after the copy Repliyo stored.
 */
export function reconciliationWindow(reference: number): { from: Date; to: Date } {
  return {
    from: new Date(reference - RECONCILIATION_MAX_TOLERANCE_MS),
    to: new Date(reference + RECONCILIATION_MAX_TOLERANCE_MS),
  };
}
