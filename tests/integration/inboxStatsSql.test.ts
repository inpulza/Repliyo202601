import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import pg from 'pg';
import { PgDialect } from 'drizzle-orm/pg-core';

import { parseInboxStatsRange } from '../../server/inboxStatsRange';
import { buildInboxResponseQuery, buildInboxVolumeQuery } from '../../server/inboxStatsSql';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithPostgres = databaseUrl ? describe : describe.skip;
const now = new Date('2026-08-24T15:30:00.000Z');
const { Client } = pg;

describeWithPostgres('production inbox metrics SQL', () => {
  const client = new Client({ connectionString: databaseUrl });
  const dialect = new PgDialect();
  before(async () => {
    await client.connect();
    await client.query(`
      CREATE TABLE conversations (
        id text PRIMARY KEY,
        brand_id text NOT NULL,
        type text NOT NULL,
        status text NOT NULL,
        customer_id text NOT NULL
      );
      CREATE TABLE messages (
        id text PRIMARY KEY,
        brand_id text NOT NULL,
        conversation_id text,
        platform text NOT NULL,
        direction text,
        timestamp timestamp NOT NULL,
        metricool_id text,
        parent_message_id text,
        internal_origin text,
        source text,
        raw_data jsonb,
        sentiment text,
        author text NOT NULL,
        content text NOT NULL
      );
    `);
  });

  after(async () => {
    await client.end();
  });

  it('returns exactly one volume series for every supported range', async () => {
    await client.query(`
      INSERT INTO messages (id, brand_id, platform, direction, timestamp, author, content)
      SELECT 'in-' || day::date, 'brand-a', 'instagram', 'inbound', day + interval '12 hours', 'customer', 'inbound'
      FROM generate_series('2025-08-25'::timestamp, '2026-08-24'::timestamp, interval '1 day') day
      UNION ALL
      SELECT 'out-' || day::date, 'brand-a', 'instagram', 'outbound', day + interval '12 hours 1 minute', 'brand', 'outbound'
      FROM generate_series('2025-08-25'::timestamp, '2026-08-24'::timestamp, interval '1 day') day
    `);

    for (const testCase of [
      { query: { days: '7' }, expectedBuckets: 7, expectedMessages: 7 },
      { query: { days: '30' }, expectedBuckets: 30, expectedMessages: 30 },
      { query: { days: '90' }, expectedBuckets: 90, expectedMessages: 90 },
      { query: { days: '365' }, expectedBuckets: 53, expectedMessages: 365 },
      { query: { range: 'all' }, expectedBuckets: 13, expectedMessages: 365 },
    ]) {
      const range = parseInboxStatsRange(testCase.query, now);
      const compiled = dialect.sqlToQuery(buildInboxVolumeQuery('brand-a', range));
      const result = await client.query(compiled.sql, compiled.params);

      assert.equal(result.rows.length, testCase.expectedBuckets, JSON.stringify(testCase.query));
      assert.equal(result.rows.reduce((sum, row) => sum + Number(row.inbound), 0), testCase.expectedMessages);
      assert.equal(result.rows.reduce((sum, row) => sum + Number(row.outbound), 0), testCase.expectedMessages);
    }
  });

  it('executes the production response SQL and reports answered over eligible cycles', async () => {
    await client.query('TRUNCATE messages, conversations');
    await client.query(`
      INSERT INTO conversations (id, brand_id, type, status, customer_id) VALUES
        ('comments', 'brand-a', 'comment', 'open', 'post-thread'),
        ('dm-answered', 'brand-a', 'dm', 'open', 'customer-a'),
        ('dm-unanswered', 'brand-a', 'dm', 'open', 'customer-b');

      INSERT INTO messages (
        id, brand_id, conversation_id, platform, direction, timestamp, metricool_id,
        parent_message_id, internal_origin, source, raw_data, sentiment, author, content
      ) VALUES
        ('comment-1', 'brand-a', 'comments', 'facebook', 'inbound', '2026-08-20 10:00:00', 'root-1', NULL, NULL, NULL, NULL, 'positive', 'customer-1', 'one'),
        ('reply-1', 'brand-a', 'comments', 'facebook', 'outbound', '2026-08-20 10:05:00', 'reply-1-external', 'comment-1', NULL, 'manual', NULL, NULL, 'brand', 'reply'),
        ('comment-2', 'brand-a', 'comments', 'facebook', 'inbound', '2026-08-20 11:00:00', 'root-2', NULL, NULL, NULL, NULL, 'neutral', 'customer-2', 'two'),
        ('reply-2', 'brand-a', 'comments', 'facebook', 'outbound', '2026-08-20 11:02:00', 'reply-2-external', 'comment-2', 'ai', 'repliyo_auto', NULL, NULL, 'brand', 'reply'),
        ('comment-3', 'brand-a', 'comments', 'facebook', 'inbound', '2026-08-20 12:00:00', 'root-3', NULL, NULL, NULL, NULL, 'negative', 'customer-3', 'three'),
        ('flattened-reply', 'brand-a', 'comments', 'facebook', 'outbound', '2026-08-20 12:02:00', 'flattened-external', 'comment-3', NULL, 'metricool_sync', '{"parentId":"nested-comment"}', NULL, 'brand', 'not a root reply'),
        ('dm-in-1', 'brand-a', 'dm-answered', 'instagram', 'inbound', '2026-08-20 13:00:00', NULL, NULL, NULL, NULL, NULL, NULL, 'customer-a', 'hello'),
        ('dm-in-2', 'brand-a', 'dm-answered', 'instagram', 'inbound', '2026-08-20 13:01:00', NULL, NULL, NULL, NULL, NULL, NULL, 'customer-a', 'again'),
        ('dm-out', 'brand-a', 'dm-answered', 'instagram', 'outbound', '2026-08-20 13:10:00', NULL, NULL, NULL, 'manual', NULL, NULL, 'brand', 'reply'),
        ('dm-in-3', 'brand-a', 'dm-unanswered', 'instagram', 'inbound', '2026-08-20 14:00:00', NULL, NULL, NULL, NULL, NULL, NULL, 'customer-b', 'pending');
    `);

    const range = parseInboxStatsRange({ days: '7' }, now);
    const compiled = dialect.sqlToQuery(buildInboxResponseQuery('brand-a', range));
    const result = await client.query(compiled.sql, compiled.params);
    const overall = result.rows.find(row => row.platform === null);
    const facebook = result.rows.find(row => row.platform === 'facebook');
    const instagram = result.rows.find(row => row.platform === 'instagram');

    assert.deepEqual(
      { eligible: overall.eligible_cycles, answered: overall.answered_cycles, samples: overall.samples },
      { eligible: 5, answered: 3, samples: 3 },
    );
    assert.deepEqual(
      { eligible: facebook.eligible_cycles, answered: facebook.answered_cycles, samples: facebook.samples },
      { eligible: 3, answered: 2, samples: 2 },
    );
    assert.deepEqual(
      { eligible: instagram.eligible_cycles, answered: instagram.answered_cycles, samples: instagram.samples },
      { eligible: 2, answered: 1, samples: 1 },
    );
    assert.equal(overall.ai_samples, 1);
    assert.equal(overall.human_samples, 2);
  });
});
