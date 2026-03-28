import crypto from 'crypto';

/**
 * Strips volatile elements from HTML to produce a stable string for hashing.
 * Removes scripts, styles, comments, timestamps, and nonces.
 *
 * Args:
 *   html: Raw HTML string.
 *
 * Returns:
 *   Normalised HTML string with volatile content removed.
 */
export function normaliseHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/data-timestamp="[^"]*"/g, '')
    .replace(/nonce="[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tier 1: Content hash check.
 * Fetches the page, normalises HTML, and compares SHA-256 hash against stored value.
 *
 * Args:
 *   url: The URL to fetch and hash.
 *   storedHash: Previously stored content hash.
 *
 * Returns:
 *   Object with changed flag and the new hash value.
 */
export async function hashCheck(
  url: string,
  storedHash: string | null,
): Promise<{ changed: boolean; newHash: string }> {
  const res = await fetch(url);
  const html = await res.text();
  const normalised = normaliseHtml(html);
  const newHash = crypto.createHash('sha256').update(normalised).digest('hex');
  return { changed: storedHash !== null ? newHash !== storedHash : true, newHash };
}
