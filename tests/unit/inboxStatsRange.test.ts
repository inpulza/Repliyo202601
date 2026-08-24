import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseInboxStatsRange } from '../../server/inboxStatsRange';

const now = new Date('2026-08-24T15:30:00.000Z');

describe('inbox metrics date ranges', () => {
  it('uses seven inclusive calendar days by default', () => {
    const range = parseInboxStatsRange({}, now);

    assert.equal(range.fromDate, '2026-08-18');
    assert.equal(range.toDate, '2026-08-24');
    assert.equal(range.toExclusive.toISOString(), '2026-08-25T00:00:00.000Z');
  });

  it('accepts bounded presets, custom ranges and full history', () => {
    assert.equal(parseInboxStatsRange({ days: '90' }, now).fromDate, '2026-05-27');
    assert.equal(
      parseInboxStatsRange({ from: '2026-08-01', to: '2026-08-10' }, now).toExclusive.toISOString(),
      '2026-08-11T00:00:00.000Z',
    );
    assert.equal(parseInboxStatsRange({ range: 'all' }, now).from, null);
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
});
