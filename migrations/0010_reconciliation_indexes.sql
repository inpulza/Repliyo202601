-- Reconciliation lookups are the hot path of every sync round: they run once
-- per synced message. Before the accompanying change they were unbounded.
--
-- Measured on production (messages: 115k rows / 570 MB):
--   * the cross-brand matcher returned 26,197 rows (35 MB, 16 MB of it raw_data)
--     on EVERY synced message;
--   * the per-brand pending matcher returned 2,212 rows for the largest brand.
--
-- Both matchers only ever accept a candidate whose timestamp is within two
-- hours of the synced message, so the queries are now bounded by that window.
-- These partial indexes turn the window into an index range scan instead of a
-- sequential scan, and stay small because they only cover Repliyo-sent rows.
--
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction block. Apply
-- this file with psql statement by statement (the default when running the file
-- without an explicit BEGIN), never wrapped in one.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "messages_pending_outbound_recon_idx"
  ON "messages" USING btree ("brand_id", "timestamp")
  WHERE "direction" = 'outbound'
    AND "metricool_id" IS NULL
    AND "source" IN ('repliyo', 'repliyo_auto', 'reminder_service');

CREATE INDEX CONCURRENTLY IF NOT EXISTS "messages_repliyo_source_recon_idx"
  ON "messages" USING btree ("timestamp")
  WHERE "source" IN ('repliyo', 'repliyo_auto', 'reminder_service');
