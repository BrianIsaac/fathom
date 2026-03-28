import type { NormalisedPublication } from './rss-sources';
import type { RegulatorySource } from '../tinyfish/sources/regulatory';

/**
 * Normalises raw TinyFish extraction data into a flat array of publications.
 * Handles the various field names returned by different regulator pages
 * (publications, releases, circulars).
 *
 * Args:
 *   source: The regulatory source configuration.
 *   data: Raw extraction data from TinyFish.
 *
 * Returns:
 *   Array of normalised publications.
 */
export function normalisePublications(
  source: RegulatorySource,
  data: Record<string, unknown>,
): NormalisedPublication[] {
  const items = (data.publications ?? data.releases ?? data.circulars ?? []) as Array<Record<string, string>>;
  return items.map(item => ({
    title: item.title ?? '',
    regulator: source.regulator,
    jurisdiction: source.jurisdiction,
    date: item.date ?? '',
    document_type: item.document_type ?? item.category ?? 'Unknown',
    url: item.url ?? '',
    reference: item.reference ?? item.release_number ?? null,
  }));
}
