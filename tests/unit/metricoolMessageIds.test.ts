import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getMetricoolParentLookupIds } from '../../shared/metricoolMessageIds';

describe('Metricool parent id lookup', () => {
  it('prefers the stored TikTok post-and-comment id before the unsafe bare id', () => {
    assert.deepEqual(
      getMetricoolParentLookupIds('tiktok', '7660185205123367702', '7659989993066138911'),
      ['7659989993066138911_7660185205123367702', '7660185205123367702'],
    );
  });

  it('keeps exact ids unchanged for other platforms and already-composite TikTok ids', () => {
    assert.deepEqual(getMetricoolParentLookupIds('facebook', 'comment-2', 'post-1'), ['comment-2']);
    assert.deepEqual(getMetricoolParentLookupIds('tiktok', 'post-1_comment-2', 'post-1'), ['post-1_comment-2']);
  });

  it('accepts numeric provider ids and rejects missing parent ids', () => {
    assert.deepEqual(getMetricoolParentLookupIds('tiktok', 456, 123), ['123_456', '456']);
    assert.deepEqual(getMetricoolParentLookupIds('tiktok', null, 123), []);
  });
});
