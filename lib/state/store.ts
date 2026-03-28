import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

/**
 * Lazily initialises and returns the Upstash Redis client.
 * Deferred to avoid build-time errors when env vars are placeholders.
 *
 * Returns:
 *   Upstash Redis client instance.
 */
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }
  return _redis;
}

export { getRedis as redis };

/**
 * Gets the stored hash for a source.
 *
 * Args:
 *   sourceId: Unique identifier for the source.
 *
 * Returns:
 *   The stored hash string, or null if not found.
 */
export async function getSourceHash(sourceId: string): Promise<string | null> {
  return getRedis().get<string>(`source:${sourceId}:hash`);
}

/**
 * Stores the hash for a source.
 *
 * Args:
 *   sourceId: Unique identifier for the source.
 *   hash: The content hash to store.
 */
export async function setSourceHash(sourceId: string, hash: string): Promise<void> {
  await getRedis().set(`source:${sourceId}:hash`, hash);
}

/**
 * Gets the last check timestamp for a source.
 *
 * Args:
 *   sourceId: Unique identifier for the source.
 *
 * Returns:
 *   ISO timestamp string, or null if never checked.
 */
export async function getLastChecked(sourceId: string): Promise<string | null> {
  return getRedis().get<string>(`source:${sourceId}:last_checked`);
}

/**
 * Sets the last check timestamp for a source.
 *
 * Args:
 *   sourceId: Unique identifier for the source.
 */
export async function setLastChecked(sourceId: string): Promise<void> {
  await getRedis().set(`source:${sourceId}:last_checked`, new Date().toISOString());
}
