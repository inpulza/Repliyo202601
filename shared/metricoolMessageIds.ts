function normalizeExternalId(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Metricool sends TikTok reply parent ids as the bare comment id, while the
 * synced message id is stored as `<postId>_<commentId>`. Return exact lookup
 * candidates in safest-first order so sync can preserve the real parent link.
 */
export function getMetricoolParentLookupIds(
  platform: string,
  rawParentId: unknown,
  postExternalId: unknown,
): string[] {
  const parentId = normalizeExternalId(rawParentId);
  if (!parentId) {
    return [];
  }

  const postId = normalizeExternalId(postExternalId);
  if (platform.trim().toLowerCase() !== 'tiktok' || !postId || parentId.includes('_')) {
    return [parentId];
  }

  return [`${postId}_${parentId}`, parentId];
}
