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

export function buildInboxResponseQuery(brandId: string, range: InboxMetricsRange): SQL {
  const responseLowerBound = range.from ? sql`AND response_at >= ${range.from}` : sql``;
  const eligibleLowerBound = range.from ? sql`AND inbound_at >= ${range.from}` : sql``;
  const commentInboundLowerBound = range.from ? sql`AND parent.timestamp >= ${range.from}` : sql``;
  const commentCandidateLowerBound = range.from
    ? sql`AND (parent.timestamp >= ${range.from} OR reply.timestamp >= ${range.from})`
    : sql``;
  const dmSourceCtes = range.from ? sql`
    dm_conversations AS (
      SELECT c.id
      FROM conversations c
      WHERE c.brand_id = ${brandId}
        AND c.type IN ('dm', 'conversation')
    ),
    dm_seed_inbounds AS (
      SELECT seed.*
      FROM dm_conversations conversation
      LEFT JOIN LATERAL (
        SELECT outbound.timestamp
        FROM messages outbound
        WHERE outbound.brand_id = ${brandId}
          AND outbound.conversation_id = conversation.id
          AND outbound.direction = 'outbound'
          AND outbound.timestamp < ${range.from}
          AND NOT EXISTS (
            SELECT 1 FROM comment_linked_outbounds linked WHERE linked.id = outbound.id
          )
        ORDER BY outbound.timestamp DESC, outbound.id DESC
        LIMIT 1
      ) last_outbound ON true
      JOIN LATERAL (
        SELECT
          inbound.id,
          inbound.conversation_id,
          inbound.platform,
          inbound.direction,
          inbound.timestamp,
          inbound.parent_message_id,
          inbound.internal_origin,
          inbound.source
        FROM messages inbound
        WHERE inbound.brand_id = ${brandId}
          AND inbound.conversation_id = conversation.id
          AND inbound.direction = 'inbound'
          AND inbound.timestamp < ${range.from}
          AND (last_outbound.timestamp IS NULL OR inbound.timestamp > last_outbound.timestamp)
        ORDER BY inbound.timestamp, inbound.id
        LIMIT 1
      ) seed ON true
    ),
    dm_source AS (
      SELECT
        m.id,
        m.conversation_id,
        m.platform,
        m.direction,
        m.timestamp,
        m.parent_message_id,
        m.internal_origin,
        m.source
      FROM messages m
      JOIN dm_conversations conversation ON conversation.id = m.conversation_id
      WHERE m.brand_id = ${brandId}
        AND m.timestamp >= ${range.from}
        AND m.timestamp < ${range.toExclusive}
        AND m.direction IN ('inbound', 'outbound')
        AND NOT EXISTS (
          SELECT 1 FROM comment_linked_outbounds linked WHERE linked.id = m.id
        )
      UNION ALL
      SELECT * FROM dm_seed_inbounds
    ),
  ` : sql`
    dm_source AS (
      SELECT
        m.id,
        m.conversation_id,
        m.platform,
        m.direction,
        m.timestamp,
        m.parent_message_id,
        m.internal_origin,
        m.source
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.brand_id = ${brandId}
        AND m.timestamp < ${range.toExclusive}
        AND m.direction IN ('inbound', 'outbound')
        AND c.type IN ('dm', 'conversation')
        AND NOT EXISTS (
          SELECT 1 FROM comment_linked_outbounds linked WHERE linked.id = m.id
        )
    ),
  `;

  return sql`
    WITH comment_linked_outbounds AS (
      SELECT reply.id
      FROM messages reply
      JOIN messages linked_parent ON linked_parent.id = reply.parent_message_id
      JOIN conversations linked_conversation ON linked_conversation.id = linked_parent.conversation_id
      WHERE reply.brand_id = ${brandId}
        AND linked_parent.brand_id = ${brandId}
        AND reply.direction = 'outbound'
        AND reply.timestamp < ${range.toExclusive}
        AND linked_conversation.type NOT IN ('dm', 'conversation')
    ),
    ${dmSourceCtes}
    dm_timeline AS (
      SELECT
        m.id,
        m.conversation_id,
        m.platform,
        m.direction,
        m.timestamp,
        m.parent_message_id,
        m.internal_origin,
        m.source,
        COUNT(*) FILTER (WHERE m.direction = 'outbound') OVER (
          PARTITION BY m.conversation_id
          ORDER BY m.timestamp, CASE WHEN m.direction = 'inbound' THEN 0 ELSE 1 END, m.id
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS prior_outbounds
      FROM dm_source m
    ),
    dm_bursts AS (
      SELECT
        conversation_id,
        prior_outbounds,
        MIN(timestamp) AS inbound_at,
        (ARRAY_AGG(id ORDER BY timestamp, id))[1] AS inbound_id,
        LOWER((ARRAY_AGG(COALESCE(NULLIF(TRIM(platform), ''), 'unknown') ORDER BY timestamp, id))[1]) AS platform
      FROM dm_timeline
      WHERE direction = 'inbound'
      GROUP BY conversation_id, prior_outbounds
    ),
    dm_pairs AS (
      SELECT
        b.inbound_id,
        o.id AS outbound_id,
        b.platform,
        b.inbound_at,
        o.timestamp AS response_at,
        CASE WHEN o.internal_origin = 'ai' OR o.source IN ('repliyo_auto', 'ai_agent') THEN 'ai' ELSE 'human' END AS origin
      FROM dm_bursts b
      JOIN dm_timeline o
        ON o.conversation_id = b.conversation_id
       AND o.prior_outbounds = b.prior_outbounds
       AND o.direction = 'outbound'
    ),
    comment_inbounds AS (
      SELECT
        parent.id AS inbound_id,
        LOWER(COALESCE(NULLIF(TRIM(parent.platform), ''), 'unknown')) AS platform,
        parent.timestamp AS inbound_at
      FROM messages parent
      JOIN conversations parent_conversation ON parent_conversation.id = parent.conversation_id
      WHERE parent.brand_id = ${brandId}
        AND parent.direction = 'inbound'
        AND parent.timestamp < ${range.toExclusive}
        AND parent_conversation.type NOT IN ('dm', 'conversation')
        ${commentInboundLowerBound}
    ),
    comment_reply_candidates AS (
      SELECT
        parent.id AS inbound_id,
        reply.id AS outbound_id,
        LOWER(COALESCE(NULLIF(TRIM(parent.platform), ''), 'unknown')) AS platform,
        parent.timestamp AS inbound_at,
        reply.timestamp AS response_at,
        CASE WHEN reply.internal_origin = 'ai' OR reply.source IN ('repliyo_auto', 'ai_agent') THEN 'ai' ELSE 'human' END AS origin
      FROM messages reply
      JOIN messages parent ON parent.id = reply.parent_message_id
      JOIN conversations parent_conversation ON parent_conversation.id = parent.conversation_id
      WHERE reply.brand_id = ${brandId}
        AND parent.brand_id = ${brandId}
        AND reply.direction = 'outbound'
        AND parent.direction = 'inbound'
        AND parent_conversation.type NOT IN ('dm', 'conversation')
        AND parent.timestamp < ${range.toExclusive}
        AND reply.timestamp < ${range.toExclusive}
        ${commentCandidateLowerBound}
        AND (
          reply.source IS DISTINCT FROM 'metricool_sync'
          OR COALESCE(
            reply.raw_data ->> 'parentId',
            reply.raw_data ->> 'parent_id',
            reply.raw_data #>> '{parent,id}'
          ) IS NULL
          OR COALESCE(
            reply.raw_data ->> 'parentId',
            reply.raw_data ->> 'parent_id',
            reply.raw_data #>> '{parent,id}'
          ) = parent.metricool_id
          OR (
            LOWER(COALESCE(NULLIF(TRIM(parent.platform), ''), 'unknown')) = 'tiktok'
            AND parent.metricool_id ~ '^[^_]+_[^_]+$'
            AND split_part(parent.metricool_id, '_', 2) = COALESCE(
              reply.raw_data ->> 'parentId',
              reply.raw_data ->> 'parent_id',
              reply.raw_data #>> '{parent,id}'
            )
          )
        )
    ),
    response_pairs AS (
      SELECT * FROM dm_pairs
      UNION ALL
      SELECT * FROM comment_reply_candidates
    ),
    valid_response_pairs AS (
      SELECT DISTINCT ON (inbound_id) *
      FROM response_pairs
      WHERE response_at >= inbound_at
      ORDER BY inbound_id, response_at, outbound_id
    ),
    period_pairs AS (
      SELECT *, EXTRACT(EPOCH FROM (response_at - inbound_at)) * 1000 AS response_ms
      FROM valid_response_pairs
      WHERE response_at < ${range.toExclusive}
        ${responseLowerBound}
    ),
    eligible_cycles AS (
      SELECT inbound_id, platform, inbound_at FROM dm_bursts
      UNION ALL
      SELECT inbound_id, platform, inbound_at FROM comment_inbounds
    ),
    period_eligible AS (
      SELECT *
      FROM eligible_cycles
      WHERE inbound_at < ${range.toExclusive}
        ${eligibleLowerBound}
    ),
    response_stats AS (
      SELECT
        platform,
        ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY response_ms))::numeric)::bigint AS median_ms,
        ROUND((percentile_cont(0.9) WITHIN GROUP (ORDER BY response_ms))::numeric)::bigint AS p90_ms,
        COUNT(*)::int AS samples,
        ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY response_ms) FILTER (WHERE origin = 'ai'))::numeric)::bigint AS ai_median_ms,
        ROUND((percentile_cont(0.9) WITHIN GROUP (ORDER BY response_ms) FILTER (WHERE origin = 'ai'))::numeric)::bigint AS ai_p90_ms,
        COUNT(*) FILTER (WHERE origin = 'ai')::int AS ai_samples,
        ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY response_ms) FILTER (WHERE origin = 'human'))::numeric)::bigint AS human_median_ms,
        ROUND((percentile_cont(0.9) WITHIN GROUP (ORDER BY response_ms) FILTER (WHERE origin = 'human'))::numeric)::bigint AS human_p90_ms,
        COUNT(*) FILTER (WHERE origin = 'human')::int AS human_samples
      FROM period_pairs
      GROUP BY GROUPING SETS ((platform), ())
    ),
    coverage_stats AS (
      SELECT
        eligible.platform,
        COUNT(DISTINCT eligible.inbound_id)::int AS eligible_cycles,
        COUNT(DISTINCT pairs.inbound_id)::int AS answered_cycles
      FROM period_eligible eligible
      LEFT JOIN response_pairs pairs ON pairs.inbound_id = eligible.inbound_id
      GROUP BY GROUPING SETS ((eligible.platform), ())
    ),
    metric_keys AS (
      SELECT platform FROM response_stats
      UNION
      SELECT platform FROM coverage_stats
    )
    SELECT
      metric_keys.platform,
      response.median_ms,
      response.p90_ms,
      COALESCE(response.samples, 0)::int AS samples,
      response.ai_median_ms,
      response.ai_p90_ms,
      COALESCE(response.ai_samples, 0)::int AS ai_samples,
      response.human_median_ms,
      response.human_p90_ms,
      COALESCE(response.human_samples, 0)::int AS human_samples,
      COALESCE(coverage.eligible_cycles, 0)::int AS eligible_cycles,
      COALESCE(coverage.answered_cycles, 0)::int AS answered_cycles
    FROM metric_keys
    LEFT JOIN response_stats response
      ON response.platform IS NOT DISTINCT FROM metric_keys.platform
    LEFT JOIN coverage_stats coverage
      ON coverage.platform IS NOT DISTINCT FROM metric_keys.platform
  `;
}
