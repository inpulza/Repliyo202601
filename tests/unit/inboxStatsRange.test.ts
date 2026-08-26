import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PgDialect } from 'drizzle-orm/pg-core';

import { parseInboxStatsRange } from '../../server/inboxStatsRange';
import { buildInboxResponseQuery, buildInboxVolumeQuery } from '../../server/inboxStatsSql';

const now = new Date('2026-08-24T15:30:00.000Z');

describe('inbox metrics date ranges', () => {
  it('uses seven inclusive calendar days by default', () => {
    const range = parseInboxStatsRange({}, now);

    assert.equal(range.fromDate, '2026-08-18');
    assert.equal(range.toDate, '2026-08-24');
    assert.equal(range.from?.toISOString(), '2026-08-17T22:00:00.000Z');
    assert.equal(range.toExclusive.toISOString(), '2026-08-24T22:00:00.000Z');
    assert.equal(range.timezone, 'Europe/Madrid');
    assert.equal(range.granularity, 'day');
  });

  it('accepts bounded presets, custom ranges and full history', () => {
    assert.equal(parseInboxStatsRange({ days: '90' }, now).fromDate, '2026-05-27');
    assert.equal(
      parseInboxStatsRange({ from: '2026-08-01', to: '2026-08-10' }, now).toExclusive.toISOString(),
      '2026-08-10T22:00:00.000Z',
    );
    assert.equal(parseInboxStatsRange({ range: 'all' }, now).from, null);
    assert.equal(parseInboxStatsRange({ days: '365' }, now).granularity, 'week');
    assert.equal(parseInboxStatsRange({ range: 'all' }, now).granularity, 'month');
  });

  it('uses Madrid calendar boundaries across daylight-saving changes and ignores unrelated query parameters', () => {
    const summer = parseInboxStatsRange({ from: '2026-08-01', to: '2026-08-01', cacheBust: '1' }, now);
    const winter = parseInboxStatsRange({ from: '2026-12-01', to: '2026-12-01' }, now);

    assert.equal(summer.from?.toISOString(), '2026-07-31T22:00:00.000Z');
    assert.equal(winter.from?.toISOString(), '2026-11-30T23:00:00.000Z');
  });

  it('rejects ambiguous, reversed, malformed or oversized ranges', () => {
    for (const query of [
      { days: '0' },
      { days: '366' },
      { from: '2026-08-01' },
      { from: '2026-08-10', to: '2026-08-01' },
      { from: '2025-01-01', to: '2026-08-01' },
      { days: '7', range: 'all' },
      { from: '2026-02-30', to: '2026-03-01' },
    ]) {
      assert.throws(() => parseInboxStatsRange(query, now));
    }
  });

  it('keeps volume bounds aggregated for preset and full-history SQL', () => {
    const dialect = new PgDialect();
    for (const query of [{ days: '7' }, { range: 'all' }]) {
      const range = parseInboxStatsRange(query, now);
      const compiled = dialect.sqlToQuery(buildInboxVolumeQuery('brand-a', range)).sql;
      const bounds = compiled.match(/bounds\s+AS\s*\(([\s\S]*?)\),\s*buckets\s+AS/i)?.[1];

      assert.ok(bounds, 'the production volume query must contain a bounds CTE');
      assert.match(bounds, /SELECT\s+COALESCE/i);
      assert.match(bounds, /MIN\(local_timestamp\)/i);
    }
  });

  it('bounds preset DM timelines with one pending seed and orders tied events causally', () => {
    const dialect = new PgDialect();
    const bounded = dialect.sqlToQuery(
      buildInboxResponseQuery('brand-a', parseInboxStatsRange({ days: '7' }, now)),
    ).sql;
    const fullHistory = dialect.sqlToQuery(
      buildInboxResponseQuery('brand-a', parseInboxStatsRange({ range: 'all' }, now)),
    ).sql;

    assert.match(bounded, /dm_seed_inbounds\s+AS/i);
    assert.match(bounded, /m\.timestamp\s+>=/i);
    assert.match(bounded, /CASE WHEN m\.direction = 'inbound' THEN 0 ELSE 1 END/i);
    assert.match(bounded, /AND parent\.timestamp\s+>=/i);
    assert.doesNotMatch(bounded, /OR reply\.timestamp\s+>=/i);
    assert.doesNotMatch(bounded, /comment_linked_outbounds\s+AS/i);
    assert.match(bounded, /linked_parent\.id\s*=\s*(?:outbound|m)\.parent_message_id/i);
    assert.match(bounded, /'repliyo_auto', 'ai_agent'/i);
    assert.doesNotMatch(fullHistory, /dm_seed_inbounds\s+AS/i);
  });
});
