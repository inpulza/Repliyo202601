import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveMetricoolParentMessageId } from '../../server/metricoolParentResolver';

describe('Metricool reply parent resolution', () => {
  it('keeps a TikTok short parent linked to the stored composite root id', async () => {
    const lookups: string[] = [];
    const parentId = await resolveMetricoolParentMessageId({
      platform: 'tiktok',
      rawParentId: '7660185205123367702',
      postExternalId: '7659989993066138911',
      rootMetricoolIds: ['7659989993066138911_7660185205123367702'],
      rootMessageId: 'root-db-id',
      findByMetricoolId: async candidate => {
        lookups.push(candidate);
        return undefined;
      },
    });

    assert.equal(parentId, 'root-db-id');
    assert.deepEqual(lookups, []);
  });

  it('finds a nested TikTok parent through the composite id before the bare id', async () => {
    const lookups: string[] = [];
    const parentId = await resolveMetricoolParentMessageId({
      platform: 'tiktok',
      rawParentId: 'nested-comment',
      postExternalId: 'post-1',
      rootMetricoolIds: ['post-1_root-comment'],
      rootMessageId: 'root-db-id',
      findByMetricoolId: async candidate => {
        lookups.push(candidate);
        return candidate === 'post-1_nested-comment' ? { id: 'nested-db-id' } : undefined;
      },
    });

    assert.equal(parentId, 'nested-db-id');
    assert.deepEqual(lookups, ['post-1_nested-comment']);
  });

  it('fails closed instead of attaching an unknown explicit parent to the root', async () => {
    const parentId = await resolveMetricoolParentMessageId({
      platform: 'facebook',
      rawParentId: 'missing-comment',
      postExternalId: 'post-1',
      rootMetricoolIds: ['root-comment'],
      rootMessageId: 'root-db-id',
      findByMetricoolId: async () => undefined,
    });

    assert.equal(parentId, null);
  });
});
