import { sql, type SQL } from 'drizzle-orm';

import type { InboxMetricsRange } from '@shared/inboxMetrics';

export function buildInboxVolumeQuery(brandId: string, range: InboxMetricsRange): SQL {
  const lowerBound = range.from ? sql`AND m.timestamp >= ${range.from}` : sql``;
  const requestedStart = range.from
    ? sql`date_trunc(${range.granularity}, (${range.from}::timestamp AT TIME ZONE 'UTC' AT TIME ZONE ${range.timezone}))`
    : sql`NULL::timestamp`;
  const seriesStep = range.granularity === 'day'
    ? sql`interval '1 day'`
    : range.granularity === 'week' ? sql`interval '1 week'` : sql`interval '1 month'`;

  return sql`
    WITH metric_messages AS (
      SELECT
        (m.timestamp AT TIME ZONE 'UTC' AT TIME ZONE ${range.timezone}) AS local_timestamp,
        m.direction
      FROM messages m
      WHERE m.brand_id = ${brandId}
        AND m.timestamp < ${range.toExclusive}
        ${lowerBound}
        AND m.direction IN ('inbound', 'outbound')
    ),
    bounds AS (
      SELECT COALESCE(
        ${requestedStart},
        date_trunc(${range.granularity}, MIN(local_timestamp))
      ) AS first_bucket
      FROM metric_messages
    ),
    buckets AS (
      SELECT generate_series(
        first_bucket,
        date_trunc(${range.granularity}, (${range.toExclusive}::timestamp AT TIME ZONE 'UTC' AT TIME ZONE ${range.timezone}) - interval '1 microsecond'),
        ${seriesStep}
      ) AS bucket
      FROM bounds
      WHERE first_bucket IS NOT NULL
    ),
    counts AS (
      SELECT
        date_trunc(${range.granularity}, local_timestamp) AS bucket,
        COUNT(*) FILTER (WHERE direction = 'inbound')::int AS inbound,
        COUNT(*) FILTER (WHERE direction = 'outbound')::int AS outbound
      FROM metric_messages
      GROUP BY 1
    )
    SELECT
      TO_CHAR(b.bucket, 'YYYY-MM-DD') AS date,
      COALESCE(c.inbound, 0)::int AS inbound,
      COALESCE(c.outbound, 0)::int AS outbound
    FROM buckets b
    LEFT JOIN counts c USING (bucket)
    ORDER BY b.bucket
  `;
}
