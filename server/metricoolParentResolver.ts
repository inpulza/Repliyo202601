import { getMetricoolParentLookupIds } from '@shared/metricoolMessageIds';

interface ResolveMetricoolParentOptions {
  platform: string;
  rawParentId: unknown;
  postExternalId: unknown;
  rootMetricoolIds: Array<string | null | undefined>;
  rootMessageId: string;
  findByMetricoolId: (metricoolId: string) => Promise<{ id: string } | undefined>;
}

export async function resolveMetricoolParentMessageId({
  platform,
  rawParentId,
  postExternalId,
  rootMetricoolIds,
  rootMessageId,
  findByMetricoolId,
}: ResolveMetricoolParentOptions): Promise<string | null> {
  const lookupIds = getMetricoolParentLookupIds(platform, rawParentId, postExternalId);
  if (lookupIds.length === 0 || lookupIds.some(candidate => rootMetricoolIds.includes(candidate))) {
    return rootMessageId;
  }

  for (const candidate of lookupIds) {
    const parent = await findByMetricoolId(candidate);
    if (parent) {
      return parent.id;
    }
  }

  return null;
}
