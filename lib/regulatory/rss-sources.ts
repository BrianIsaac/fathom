export interface NormalisedPublication {
  title: string;
  regulator: string;
  jurisdiction: string;
  date: string;
  document_type: string;
  url: string;
  reference?: string | null;
}

export interface RegulatoryRSSSource {
  id: string;
  regulator: string;
  jurisdiction: string;
  type: 'rss' | 'api';
  url: string;
  parseResponse: (data: string | object) => NormalisedPublication[];
}

/**
 * Parses standard RSS XML into normalised publications.
 *
 * Args:
 *   xml: Raw RSS XML string.
 *   regulator: Regulator name for tagging.
 *   jurisdiction: Jurisdiction code for tagging.
 *
 * Returns:
 *   Array of normalised publications extracted from RSS items.
 */
export function parseRSSXML(xml: string, regulator: string, jurisdiction: string): NormalisedPublication[] {
  const items: NormalisedPublication[] = [];
  const stripCDATA = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

  // Match both RSS 2.0 (<item>...</item>) and RDF/RSS 1.0 (<item rdf:about="...">...</item>)
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '';
    const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? '';
    const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim()
      ?? itemXml.match(/<dc:date>([\s\S]*?)<\/dc:date>/)?.[1]?.trim() ?? '';

    if (title) {
      items.push({
        title: stripCDATA(title),
        regulator,
        jurisdiction,
        date: stripCDATA(pubDate),
        document_type: 'Press Release',
        url: stripCDATA(link),
      });
    }
  }

  return items;
}

export const RSS_SOURCES: RegulatoryRSSSource[] = [
  {
    id: 'sec_press',
    regulator: 'SEC',
    jurisdiction: 'US',
    type: 'rss',
    url: 'https://www.sec.gov/news/pressreleases.rss',
    parseResponse: (xml) => parseRSSXML(xml as string, 'SEC', 'US'),
  },
  {
    id: 'hkma_circulars',
    regulator: 'HKMA',
    jurisdiction: 'HK',
    type: 'rss',
    url: 'https://www.hkma.gov.hk/eng/other-information/rss/rss_circulars.xml',
    parseResponse: (xml) => parseRSSXML(xml as string, 'HKMA', 'HK'),
  },
  {
    id: 'hkma_press',
    regulator: 'HKMA',
    jurisdiction: 'HK',
    type: 'api',
    url: 'https://api.hkma.gov.hk/public/press-releases?lang=en',
    parseResponse: (json) => {
      const data = json as { result: { records: Array<{ date: string; title: string; link: string }> } };
      return data.result.records.map(r => ({
        title: r.title,
        regulator: 'HKMA',
        jurisdiction: 'HK',
        date: r.date,
        document_type: 'Press Release',
        url: r.link,
      }));
    },
  },
  {
    id: 'bis_all',
    regulator: 'BIS',
    jurisdiction: 'INT',
    type: 'rss',
    url: 'https://www.bis.org/doclist/all_pressrels.rss',
    parseResponse: (xml) => parseRSSXML(xml as string, 'BIS', 'INT'),
  },
];

/**
 * Fetches all RSS/API sources for the given jurisdictions.
 *
 * Args:
 *   jurisdictions: Array of jurisdiction codes to filter by.
 *
 * Returns:
 *   Array of normalised publications from all matching RSS/API sources.
 */
export async function fetchRSSSources(jurisdictions: string[]): Promise<NormalisedPublication[]> {
  const jurisdictionToSources: Record<string, string[]> = {
    'US': ['sec_press'],
    'HK': ['hkma_circulars', 'hkma_press'],
    'INT': ['bis_all'],
  };

  const activeIds = new Set(
    jurisdictions.flatMap(j => jurisdictionToSources[j] ?? [])
  );

  const activeSources = RSS_SOURCES.filter(s => activeIds.has(s.id));

  const results = await Promise.allSettled(
    activeSources.map(async (source) => {
      const res = await fetch(source.url);
      if (source.type === 'rss') {
        const xml = await res.text();
        return source.parseResponse(xml);
      } else {
        const json = await res.json();
        return source.parseResponse(json);
      }
    })
  );

  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}
