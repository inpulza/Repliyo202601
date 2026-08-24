import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateInboxMetrics, type InboxMetricsMessage } from '../../shared/inboxMetrics';

const range = {
  from: new Date('2026-08-01T00:00:00.000Z'),
  toExclusive: new Date('2026-08-04T00:00:00.000Z'),
};

describe('inbox operational metrics', () => {
  it('counts only explicit inbound and outbound messages in the selected period', () => {
    const metrics = calculateInboxMetrics([
      message('before', '2026-07-31T23:59:59.000Z', 'inbound'),
      message('in', '2026-08-01T10:00:00.000Z', 'inbound', { sentiment: 'positive' }),
      message('out', '2026-08-01T10:02:00.000Z', 'outbound'),
      message('unknown', '2026-08-01T11:00:00.000Z', null),
      message('after', '2026-08-04T00:00:00.000Z', 'outbound'),
    ], range);

    assert.equal(metrics.totalMessages, 2);
    assert.equal(metrics.inboundMessages, 1);
    assert.equal(metrics.outboundMessages, 1);
    assert.deepEqual(metrics.bySentiment, { positive: 1 });
  });

  it('measures the first outbound response to each inbound message burst', () => {
    const metrics = calculateInboxMetrics([
      message('in-1', '2026-08-01T10:00:00.000Z', 'inbound'),
      message('in-2', '2026-08-01T10:01:00.000Z', 'inbound'),
      message('out-1', '2026-08-01T10:05:00.000Z', 'outbound'),
      message('out-2', '2026-08-01T10:06:00.000Z', 'outbound'),
      message('in-3', '2026-08-01T11:00:00.000Z', 'inbound'),
      message('out-3', '2026-08-01T11:01:00.000Z', 'outbound'),
    ], range);

    assert.equal(metrics.responseSamples, 2);
    assert.equal(metrics.avgResponseTimeMs, 3 * 60 * 1000);
    assert.equal(metrics.byPlatform.instagram.responseSamples, 2);
  });

  it('does not pretend an unanswered inbound message has a response time', () => {
    const metrics = calculateInboxMetrics([
      message('in-1', '2026-08-01T10:00:00.000Z', 'inbound'),
    ], range);

    assert.equal(metrics.avgResponseTimeMs, null);
    assert.equal(metrics.responseSamples, 0);
  });

  it('keeps response cycles isolated by conversation and platform', () => {
    const metrics = calculateInboxMetrics([
      message('ig-in', '2026-08-01T10:00:00.000Z', 'inbound', { conversationId: 'ig' }),
      message('fb-in', '2026-08-01T10:01:00.000Z', 'inbound', { conversationId: 'fb', platform: 'facebook' }),
      message('fb-out', '2026-08-01T10:03:00.000Z', 'outbound', { conversationId: 'fb', platform: 'facebook' }),
      message('ig-out', '2026-08-01T10:10:00.000Z', 'outbound', { conversationId: 'ig' }),
    ], range);

    assert.equal(metrics.byPlatform.facebook.avgResponseTimeMs, 2 * 60 * 1000);
    assert.equal(metrics.byPlatform.instagram.avgResponseTimeMs, 10 * 60 * 1000);
  });

  it('fills inactive calendar days so the chart does not hide gaps', () => {
    const metrics = calculateInboxMetrics([
      message('in', '2026-08-02T10:00:00.000Z', 'inbound'),
    ], range);

    assert.deepEqual(metrics.dailyStats, [
      { date: '2026-08-01', inbound: 0, outbound: 0 },
      { date: '2026-08-02', inbound: 1, outbound: 0 },
      { date: '2026-08-03', inbound: 0, outbound: 0 },
    ]);
  });
});

function message(
  id: string,
  timestamp: string,
  direction: string | null,
  overrides: Partial<InboxMetricsMessage & { sentiment: string | null }> = {},
): InboxMetricsMessage & { sentiment?: string | null } {
  return {
    id,
    conversationId: 'conversation-a',
    platform: 'instagram',
    direction,
    timestamp: new Date(timestamp),
    ...overrides,
  };
}
