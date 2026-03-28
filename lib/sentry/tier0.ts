/**
 * Tier 0: HTTP conditional check using ETags.
 * Cheapest check -- no page rendering, no TinyFish credits.
 *
 * Args:
 *   url: The URL to check.
 *   storedEtag: Previously stored ETag, or null if first check.
 *
 * Returns:
 *   Object with status ('unchanged', 'changed', or 'unsupported') and the etag value.
 */
export async function conditionalCheck(
  url: string,
  storedEtag: string | null,
): Promise<{ status: 'unchanged' | 'changed' | 'unsupported'; etag: string | null }> {
  const res = await fetch(url, {
    method: 'HEAD',
    headers: storedEtag ? { 'If-None-Match': storedEtag } : {},
  });

  const newEtag = res.headers.get('etag');

  if (res.status === 304) return { status: 'unchanged', etag: storedEtag };
  if (newEtag) return { status: 'changed', etag: newEtag };
  return { status: 'unsupported', etag: null };
}
