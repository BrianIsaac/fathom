export interface SourceState {
  source_id: string;
  last_changed: number;
  check_interval_seconds: number;
}

/**
 * Computes the next check interval based on how recently a source changed.
 * Sources that change frequently are checked more often.
 *
 * Args:
 *   source: The source state including last change timestamp.
 *
 * Returns:
 *   Next interval in seconds.
 */
export function computeNextInterval(source: SourceState): number {
  const hoursSinceLastChange = (Date.now() - source.last_changed) / 3600000;

  if (hoursSinceLastChange < 1) return 5 * 60;
  if (hoursSinceLastChange < 24) return 30 * 60;
  if (hoursSinceLastChange < 168) return 60 * 60;
  return 6 * 60 * 60;
}
