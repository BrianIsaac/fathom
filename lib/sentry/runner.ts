import { conditionalCheck } from './tier0';
import { hashCheck } from './tier1';
import { getSourceHash, setSourceHash, setLastChecked } from '../state/store';
import { isMockMode } from '../data';

export interface SentrySource {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'tinyfish';
}

export interface SentryResult {
  source_id: string;
  source_name: string;
  tier_reached: number;
  change_detected: boolean;
  etag: string | null;
  content_hash: string | null;
  latency_ms: number;
  error: string | null;
}

/**
 * Runs the three-tier cascade for a single source.
 * Tier 0: HTTP conditional check (ETag) -- cheapest.
 * Tier 1: Content hash comparison -- moderate cost.
 * Tier 2: Full TinyFish extraction -- expensive, only if change detected.
 *
 * Args:
 *   source: The source to check.
 *
 * Returns:
 *   Result including which tier was reached and whether a change was detected.
 */
export async function runCascade(source: SentrySource): Promise<SentryResult> {
  const startTime = Date.now();

  if (isMockMode()) {
    return {
      source_id: source.id,
      source_name: source.name,
      tier_reached: 1,
      change_detected: true,
      etag: null,
      content_hash: 'mock-hash',
      latency_ms: 50,
      error: null,
    };
  }

  try {
    const storedHash = await getSourceHash(source.id);
    const tier0 = await conditionalCheck(source.url, null);

    if (tier0.status === 'unchanged') {
      await setLastChecked(source.id);
      return {
        source_id: source.id,
        source_name: source.name,
        tier_reached: 0,
        change_detected: false,
        etag: tier0.etag,
        content_hash: storedHash,
        latency_ms: Date.now() - startTime,
        error: null,
      };
    }

    const tier1 = await hashCheck(source.url, storedHash);

    if (!tier1.changed) {
      await setLastChecked(source.id);
      return {
        source_id: source.id,
        source_name: source.name,
        tier_reached: 1,
        change_detected: false,
        etag: tier0.etag,
        content_hash: tier1.newHash,
        latency_ms: Date.now() - startTime,
        error: null,
      };
    }

    await setSourceHash(source.id, tier1.newHash);
    await setLastChecked(source.id);

    return {
      source_id: source.id,
      source_name: source.name,
      tier_reached: 1,
      change_detected: true,
      etag: tier0.etag,
      content_hash: tier1.newHash,
      latency_ms: Date.now() - startTime,
      error: null,
    };
  } catch (err) {
    return {
      source_id: source.id,
      source_name: source.name,
      tier_reached: -1,
      change_detected: false,
      etag: null,
      content_hash: null,
      latency_ms: Date.now() - startTime,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Runs the cascade for all sources in parallel.
 *
 * Args:
 *   sources: Array of sources to check.
 *
 * Returns:
 *   Array of results, one per source.
 */
export async function runAllCascades(sources: SentrySource[]): Promise<SentryResult[]> {
  const results = await Promise.allSettled(sources.map(runCascade));
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      source_id: sources[i].id,
      source_name: sources[i].name,
      tier_reached: -1,
      change_detected: false,
      etag: null,
      content_hash: null,
      latency_ms: 0,
      error: r.reason?.message ?? 'Unknown error',
    };
  });
}
