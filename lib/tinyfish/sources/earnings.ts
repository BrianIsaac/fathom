export interface EarningsSource {
  id: string;
  name: string;
  buildUrl: (ticker: string) => string | null;
  goal: string;
  browserProfile: 'lite' | 'stealth';
}

export const IR_URLS: Record<string, string> = {
  'AAPL': 'https://investor.apple.com/',
  'MSFT': 'https://www.microsoft.com/en-us/investor',
  'GOOGL': 'https://abc.xyz/investor/',
  'GRAB': 'https://investors.grab.com/',
  'SE': 'https://www.sea.com/investor/home',
  'D05.SI': 'https://www.dbs.com/investor/index.html',
  'O39.SI': 'https://www.ocbc.com/group/investors',
  'U11.SI': 'https://www.uobgroup.com/investor-relations/',
};

export const EARNINGS_SOURCES: EarningsSource[] = [
  {
    id: 'yahoo_finance',
    name: 'Yahoo Finance',
    buildUrl: (ticker) => `https://sg.finance.yahoo.com/quote/${ticker}`,
    goal: 'Navigate to the financials or earnings section for this ticker. Extract the most recent quarterly earnings as JSON: {"ticker": str, "company_name": str, "report_date": str, "fiscal_quarter": str, "eps_actual": float or null, "eps_estimate": float or null, "revenue_actual": str or null, "revenue_estimate": str or null, "current_price": str, "market_cap": str}. If earnings data is not available, return {"error": "no_earnings_data", "ticker": str}.',
    browserProfile: 'lite',
  },
  {
    id: 'company_ir',
    name: 'Company IR',
    buildUrl: (ticker) => IR_URLS[ticker] ?? null,
    goal: 'Find the most recent earnings release or quarterly results announcement on this investor relations page. Extract as JSON: {"company_name": str, "report_date": str, "fiscal_quarter": str, "headline": str, "eps": str or null, "revenue": str or null, "key_highlights": [str], "pdf_url": str or null}. If no earnings release is found, return {"error": "no_earnings_found"}.',
    browserProfile: 'lite',
  },
];
