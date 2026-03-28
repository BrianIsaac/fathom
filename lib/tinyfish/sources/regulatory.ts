export interface RegulatorySource {
  id: string;
  regulator: string;
  jurisdiction: string;
  url: string;
  goal: string;
  browserProfile: 'lite' | 'stealth';
  proxyEnabled: boolean;
  rssFallbackId?: string;
}

export const REGULATORY_SOURCES: RegulatorySource[] = [
  {
    id: 'mas_publications',
    regulator: 'MAS',
    jurisdiction: 'SG',
    url: 'https://www.mas.gov.sg/publications',
    goal: 'Extract the 10 most recent publications as JSON: {"publications": [{"title": str, "date": str, "category": str, "document_type": str, "url": str}]}. Include circulars, consultation papers, guidelines, and enforcement actions. Sort by date descending.',
    browserProfile: 'stealth',
    proxyEnabled: true,
  },
  {
    id: 'mas_news',
    regulator: 'MAS',
    jurisdiction: 'SG',
    url: 'https://www.mas.gov.sg/news',
    goal: 'Extract the 10 most recent news and media releases as JSON: {"releases": [{"title": str, "date": str, "category": str, "url": str}]}. Sort by date descending.',
    browserProfile: 'stealth',
    proxyEnabled: true,
  },
  {
    id: 'sec_press',
    regulator: 'SEC',
    jurisdiction: 'US',
    url: 'https://www.sec.gov/newsroom/press-releases',
    goal: 'Extract the 10 most recent press releases as JSON: {"publications": [{"title": str, "date": str, "document_type": str, "url": str}]}. Sort by date descending.',
    browserProfile: 'stealth',
    proxyEnabled: true,
    rssFallbackId: 'sec_press',
  },
  {
    id: 'hkma_brdr',
    regulator: 'HKMA',
    jurisdiction: 'HK',
    url: 'https://brdr.hkma.gov.hk/eng/fltr-rslt/doc-type/CIR',
    goal: 'Extract the 10 most recent banking regulatory circulars as JSON: {"circulars": [{"title": str, "date": str, "reference": str, "category": str, "url": str}]}. Sort by date descending.',
    browserProfile: 'stealth',
    proxyEnabled: true,
    rssFallbackId: 'hkma_circulars',
  },
  {
    id: 'fca_publications',
    regulator: 'FCA',
    jurisdiction: 'UK',
    url: 'https://www.fca.org.uk/publications',
    goal: 'Extract the 10 most recent publications as JSON: {"publications": [{"title": str, "date": str, "document_type": str, "url": str}]}. Include policy statements, consultation papers, and guidance. Sort by date descending.',
    browserProfile: 'stealth',
    proxyEnabled: true,
  },
  {
    id: 'bis_publications',
    regulator: 'BIS',
    jurisdiction: 'INT',
    url: 'https://www.bis.org/other_publications/index.htm',
    goal: 'Extract the 10 most recent publications as JSON: {"publications": [{"title": str, "date": str, "document_type": str, "url": str}]}. Sort by date descending.',
    browserProfile: 'stealth',
    proxyEnabled: true,
    rssFallbackId: 'bis_all',
  },
  {
    id: 'sgx_regco',
    regulator: 'SGX RegCo',
    jurisdiction: 'SG',
    url: 'https://www.sgx.com/regulation/circulars',
    goal: 'Extract the 10 most recent regulatory circulars as JSON: {"circulars": [{"title": str, "date": str, "category": str, "url": str}]}. Sort by date descending.',
    browserProfile: 'stealth',
    proxyEnabled: true,
  },
];
