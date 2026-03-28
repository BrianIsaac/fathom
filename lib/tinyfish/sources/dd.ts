export interface DDSource {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  buildUrl: (company: string, ticker?: string) => string;
  goal: string;
  browserProfile: 'lite' | 'stealth';
  timeoutMs: number;
  required: boolean;
}

export const DD_SOURCES: DDSource[] = [
  {
    id: 'google_news',
    name: 'Google News',
    tier: 1,
    buildUrl: (company) =>
      `https://news.google.com/search?q=${encodeURIComponent(company)}&hl=en-SG&gl=SG&ceid=SG:en`,
    goal: 'Extract the 5 most recent news articles about "{company}" as JSON: {"articles": [{"title": str, "source": str, "date": str, "url": str, "snippet": str}]}. Only include articles from the last 30 days. If fewer than 5 articles exist, return what is available. If no articles are found, return {"articles": []}.',
    browserProfile: 'lite',
    timeoutMs: 15000,
    required: true,
  },
  {
    id: 'yahoo_finance',
    name: 'Yahoo Finance',
    tier: 1,
    buildUrl: (_, ticker) =>
      `https://sg.finance.yahoo.com/quote/${ticker}`,
    goal: 'Extract the company financial summary as JSON: {"ticker": str, "company_name": str, "exchange": str, "current_price": str, "market_cap": str, "pe_ratio": str or null, "52_week_range": str, "avg_volume": str, "dividend_yield": str or null, "sector": str, "industry": str}. If the ticker is not found, return {"error": "ticker_not_found"}.',
    browserProfile: 'lite',
    timeoutMs: 15000,
    required: true,
  },
  {
    id: 'sgx_announcements',
    name: 'SGX Announcements',
    tier: 1,
    buildUrl: () => 'https://www.sgx.com/securities/company-announcements',
    goal: 'Search for announcements from "{company}" in the company announcements section. Extract the 5 most recent announcements as JSON: {"announcements": [{"title": str, "date": str, "category": str, "url": str}]}. If no announcements are found, return {"announcements": []}.',
    browserProfile: 'lite',
    timeoutMs: 20000,
    required: false,
  },
  {
    id: 'elitigation',
    name: 'SG Courts (eLitigation)',
    tier: 1,
    buildUrl: () => 'https://www.elitigation.sg/gd/',
    goal: 'Search for "{company}" in the judgments search. Extract up to 5 relevant court cases as JSON: {"cases": [{"case_name": str, "citation": str, "date": str, "court": str, "subject_matter": str}]}. If no cases are found, return {"cases": []}.',
    browserProfile: 'lite',
    timeoutMs: 15000,
    required: false,
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor',
    tier: 2,
    buildUrl: () => 'https://www.glassdoor.com/Reviews/company-reviews.htm',
    goal: 'Search for "{company}" and navigate to their company review page. Extract as JSON: {"company_name": str, "overall_rating": float, "total_reviews": int, "recommend_to_friend": str, "ceo_approval": str or null, "pros_summary": str, "cons_summary": str}. If the company is not found, return {"error": "not_found"}. If blocked or CAPTCHA appears, return {"error": "blocked"}.',
    browserProfile: 'stealth',
    timeoutMs: 20000,
    required: false,
  },
];
