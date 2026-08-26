import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  matchResponseCycles,
  summarizeResponseCycles,
  type ResponseMetricMessage,
} from '../../shared/inboxMetrics';

const range = {
  from: new Date('2026-08-01T00:00:00.000Z'),
  toExclusive: new Date('2026-08-04T00:00:00.000Z'),
};

describe('inbox response-time business rules', () => {
  it('only matches a comment reply to its exact parent, including a cross-conversation private reply', () => {
    const cycles = matchResponseCycles([
      message('comment-a', '2026-08-01T10:00:00.000Z', 'inbound', { conversationId: 'post-thread', conversationType: 'comment' }),
      message('comment-b', '2026-08-01T10:01:00.000Z', 'inbound', { conversationId: 'post-thread', conversationType: 'comment' }),
      message('unrelated-reply', '2026-08-01T10:02:00.000Z', 'outbound', { conversationId: 'post-thread', conversationType: 'comment' }),
      message('private-reply', '2026-08-01T10:05:00.000Z', 'outbound', {
        conversationId: 'new-dm-thread', conversationType: 'dm', parentMessageId: 'comment-a',
      }),
    ], range);

    assert.deepEqual(cycles.map(cycle => [cycle.inboundMessageId, cycle.outboundMessageId, cycle.responseMs]), [
      ['comment-a', 'private-reply', 5 * 60 * 1000],
    ]);
  });

  it('measures the first outbound after a DM inbound burst and preserves a burst crossing the range boundary', () => {
    const cycles = matchResponseCycles([
      message('in-before', '2026-07-31T23:55:00.000Z', 'inbound'),
      message('in-after', '2026-08-01T00:01:00.000Z', 'inbound'),
      message('out-first', '2026-08-01T00:05:00.000Z', 'outbound'),
      message('out-extra', '2026-08-01T00:06:00.000Z', 'outbound'),
      message('in-next', '2026-08-01T01:00:00.000Z', 'inbound'),
      message('out-next', '2026-08-01T01:02:00.000Z', 'outbound'),
    ], range);

    assert.deepEqual(cycles.map(cycle => [cycle.outboundMessageId, cycle.responseMs]), [
      ['out-first', 10 * 60 * 1000],
      ['out-next', 2 * 60 * 1000],
    ]);
  });

  it('reports honest median and p90 distributions split between AI and human replies', () => {
    const summary = summarizeResponseCycles([
      cycle(1, 'ai'), cycle(2, 'ai'), cycle(15, 'human'), cycle(115, 'human'),
    ], 10);

    assert.equal(summary.medianMs, 8.5 * 60 * 1000);
    assert.equal(summary.p90Ms, 85 * 60 * 1000);
    assert.deepEqual(summary.ai, { medianMs: 1.5 * 60 * 1000, p90Ms: 1.9 * 60 * 1000, samples: 2 });
    assert.deepEqual(summary.human, { medianMs: 65 * 60 * 1000, p90Ms: 105 * 60 * 1000, samples: 2 });
    assert.deepEqual(summary.coverage, { eligible: 10, answered: 4, rate: 40 });
  });

  it('does not invent a response time for unanswered messages', () => {
    const cycles = matchResponseCycles([message('inbound', '2026-08-01T10:00:00.000Z', 'inbound')], range);
    assert.deepEqual(summarizeResponseCycles(cycles), {
      medianMs: null, p90Ms: null, samples: 0,
      ai: { medianMs: null, p90Ms: null, samples: 0 },
      human: { medianMs: null, p90Ms: null, samples: 0 },
      coverage: { eligible: 0, answered: 0, rate: null },
    });
  });
});

function message(
  id: string,
  timestamp: string,
  direction: string | null,
  overrides: Partial<ResponseMetricMessage> = {},
): ResponseMetricMessage {
  return {
    id,
    conversationId: 'dm-a',
    conversationType: 'dm',
    platform: 'instagram',
    direction,
    timestamp: new Date(timestamp),
    ...overrides,
  };
}

function cycle(minutes: number, origin: 'ai' | 'human') {
  return {
    inboundMessageId: `in-${minutes}`,
    outboundMessageId: `out-${minutes}`,
    platform: 'instagram',
    responseMs: minutes * 60 * 1000,
    origin,
  } as const;
}
