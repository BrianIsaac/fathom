import type { EvalTask } from './types';

const DD_TASKS: EvalTask[] = [
  {
    task_id: 'dd-news-01',
    module: 'due_diligence',
    description: 'Extract recent news for DBS Group from Google News',
    difficulty: 'easy',
    tinyfish_config: {
      url: 'https://news.google.com/search?q=DBS+Group&hl=en-SG&gl=SG&ceid=SG:en',
      goal: 'Extract the 5 most recent news articles about "DBS Group" as JSON: {"articles": [{"title": str, "source": str, "date": str, "url": str}]}. Only include articles from the last 30 days.',
      browser_profile: 'lite',
    },
    expected_output: { articles_count_min: 3 },
    graders: { 'articles': { type: 'array_length_min', min: 3, weight: 1.0 } },
    pass_threshold: 0.8,
  },
  {
    task_id: 'dd-yf-01',
    module: 'due_diligence',
    description: 'Extract DBS Group financial summary from Yahoo Finance',
    difficulty: 'easy',
    tinyfish_config: {
      url: 'https://sg.finance.yahoo.com/quote/D05.SI',
      goal: 'Extract the company financial summary as JSON: {"ticker": str, "company_name": str, "current_price": str, "market_cap": str, "pe_ratio": str or null, "52_week_range": str, "sector": str}.',
      browser_profile: 'lite',
    },
    expected_output: { ticker: 'D05.SI', company_name: 'DBS Group', sector: 'Financial Services' },
    graders: {
      'ticker': { type: 'exact_string', case_sensitive: false, weight: 1.0 },
      'company_name': { type: 'contains', weight: 0.8 },
      'current_price': { type: 'not_null', weight: 1.0 },
      'market_cap': { type: 'not_null', weight: 1.0 },
      'sector': { type: 'contains', weight: 0.5 },
    },
    pass_threshold: 0.7,
  },
  {
    task_id: 'dd-sgx-01',
    module: 'due_diligence',
    description: 'Extract recent SGX announcements for Singapore Airlines',
    difficulty: 'medium',
    tinyfish_config: {
      url: 'https://www.sgx.com/securities/company-announcements',
      goal: 'Search for announcements from "Singapore Airlines" and extract the 5 most recent as JSON: {"announcements": [{"title": str, "date": str, "category": str}]}.',
      browser_profile: 'lite',
    },
    expected_output: { announcements_count_min: 2 },
    graders: { 'announcements': { type: 'array_length_min', min: 2, weight: 1.0 } },
    pass_threshold: 0.8,
  },
  {
    task_id: 'dd-elit-01',
    module: 'due_diligence',
    description: 'Search for court cases involving "Grab" on eLitigation',
    difficulty: 'medium',
    tinyfish_config: {
      url: 'https://www.elitigation.sg/gd/',
      goal: 'Search for "Grab" in the judgments search. Extract up to 5 relevant court cases as JSON: {"cases": [{"case_name": str, "citation": str, "date": str, "court": str}]}. If no cases found, return {"cases": []}.',
      browser_profile: 'lite',
    },
    expected_output: { cases_is_array: true },
    graders: { 'cases': { type: 'not_null', weight: 1.0 } },
    pass_threshold: 0.8,
  },
  {
    task_id: 'dd-glassdoor-01',
    module: 'due_diligence',
    description: 'Extract Grab Holdings reviews from Glassdoor',
    difficulty: 'hard',
    tinyfish_config: {
      url: 'https://www.glassdoor.com/Reviews/company-reviews.htm',
      goal: 'Search for "Grab" and extract company review data as JSON: {"company_name": str, "overall_rating": float, "total_reviews": int}. If blocked, return {"error": "blocked"}.',
      browser_profile: 'stealth',
    },
    expected_output: { company_name: 'Grab', overall_rating_min: 1.0, overall_rating_max: 5.0 },
    graders: {
      'company_name': { type: 'contains', weight: 0.5 },
      'overall_rating': { type: 'not_null', weight: 1.0 },
      'total_reviews': { type: 'not_null', weight: 0.5 },
    },
    pass_threshold: 0.6,
  },
];

const EARNINGS_TASKS: EvalTask[] = [
  {
    task_id: 'earn-yf-01',
    module: 'earnings',
    description: 'Extract AAPL earnings data from Yahoo Finance',
    difficulty: 'easy',
    tinyfish_config: {
      url: 'https://sg.finance.yahoo.com/quote/AAPL',
      goal: 'Navigate to the financials section. Extract the most recent quarterly earnings as JSON: {"ticker": str, "company_name": str, "eps_actual": float or null, "revenue_actual": str or null}.',
      browser_profile: 'lite',
    },
    expected_output: { ticker: 'AAPL', company_name: 'Apple' },
    graders: {
      'ticker': { type: 'exact_string', case_sensitive: false, weight: 1.0 },
      'company_name': { type: 'contains', weight: 0.5 },
      'eps_actual': { type: 'not_null', weight: 1.0 },
      'revenue_actual': { type: 'not_null', weight: 1.0 },
    },
    pass_threshold: 0.7,
  },
  {
    task_id: 'earn-yf-02',
    module: 'earnings',
    description: 'Extract MSFT earnings data from Yahoo Finance',
    difficulty: 'easy',
    tinyfish_config: {
      url: 'https://sg.finance.yahoo.com/quote/MSFT',
      goal: 'Navigate to the financials section. Extract the most recent quarterly earnings as JSON: {"ticker": str, "company_name": str, "eps_actual": float or null, "revenue_actual": str or null}.',
      browser_profile: 'lite',
    },
    expected_output: { ticker: 'MSFT', company_name: 'Microsoft' },
    graders: {
      'ticker': { type: 'exact_string', case_sensitive: false, weight: 1.0 },
      'company_name': { type: 'contains', weight: 0.5 },
      'eps_actual': { type: 'not_null', weight: 1.0 },
      'revenue_actual': { type: 'not_null', weight: 1.0 },
    },
    pass_threshold: 0.7,
  },
  {
    task_id: 'earn-ir-01',
    module: 'earnings',
    description: 'Extract latest earnings from Apple IR page',
    difficulty: 'medium',
    tinyfish_config: {
      url: 'https://investor.apple.com/',
      goal: 'Find the most recent earnings release or quarterly results. Extract as JSON: {"company_name": str, "fiscal_quarter": str, "headline": str, "key_highlights": [str]}.',
      browser_profile: 'lite',
    },
    expected_output: { company_name: 'Apple' },
    graders: {
      'company_name': { type: 'contains', weight: 0.5 },
      'fiscal_quarter': { type: 'not_null', weight: 1.0 },
      'headline': { type: 'not_null', weight: 1.0 },
      'key_highlights': { type: 'array_length_min', min: 1, weight: 0.8 },
    },
    pass_threshold: 0.7,
  },
  {
    task_id: 'earn-sa-01',
    module: 'earnings',
    description: 'Extract AAPL earnings analysis from Seeking Alpha',
    difficulty: 'hard',
    tinyfish_config: {
      url: 'https://seekingalpha.com/symbol/AAPL/earnings',
      goal: 'Extract the most recent earnings analysis as JSON: {"ticker": str, "article_title": str, "analyst_sentiment": str}. If behind paywall, return {"partial": true, "ticker": "AAPL"}.',
      browser_profile: 'stealth',
    },
    expected_output: { ticker: 'AAPL' },
    graders: {
      'ticker': { type: 'exact_string', case_sensitive: false, weight: 1.0 },
      'article_title': { type: 'not_null', weight: 0.8 },
    },
    pass_threshold: 0.5,
  },
];

const REGULATORY_TASKS: EvalTask[] = [
  {
    task_id: 'reg-mas-01',
    module: 'regulatory',
    description: 'Extract latest MAS publications',
    difficulty: 'easy',
    tinyfish_config: {
      url: 'https://www.mas.gov.sg/publications',
      goal: 'Extract the 5 most recent publications as JSON: {"publications": [{"title": str, "date": str, "category": str, "url": str}]}.',
      browser_profile: 'lite',
    },
    expected_output: { publications_count_min: 3 },
    graders: { 'publications': { type: 'array_length_min', min: 3, weight: 1.0 } },
    pass_threshold: 0.8,
  },
  {
    task_id: 'reg-sec-01',
    module: 'regulatory',
    description: 'Extract latest SEC press releases (via RSS)',
    difficulty: 'easy',
    tinyfish_config: {
      url: 'https://www.sec.gov/news/pressreleases.rss',
      goal: 'N/A — RSS feed parsed directly',
      browser_profile: 'lite',
    },
    expected_output: { releases_count_min: 3 },
    graders: { 'releases': { type: 'array_length_min', min: 3, weight: 1.0 } },
    pass_threshold: 0.8,
  },
  {
    task_id: 'reg-hkma-01',
    module: 'regulatory',
    description: 'Extract latest HKMA circulars via RSS feed',
    difficulty: 'easy',
    tinyfish_config: {
      url: 'https://www.hkma.gov.hk/eng/other-information/rss/rss_circulars.xml',
      goal: 'N/A — RSS feed parsed directly',
      browser_profile: 'lite',
    },
    expected_output: { circulars_count_min: 3 },
    graders: { 'circulars': { type: 'array_length_min', min: 3, weight: 1.0 } },
    pass_threshold: 0.8,
  },
];

const CYBER_TASKS: EvalTask[] = [
  {
    task_id: 'cyber-headers-01',
    module: 'cyber',
    description: 'Detect missing security headers on OWASP Juice Shop',
    difficulty: 'easy',
    tinyfish_config: {
      url: 'https://preview.owasp-juice.shop',
      goal: 'Check the HTTP response headers of this site. Report which security headers are missing from: Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Content-Security-Policy, Permissions-Policy, Referrer-Policy. Return JSON: {"missing_headers": string[], "present_headers": string[], "vulnerable": boolean}',
      browser_profile: 'stealth',
    },
    expected_output: { vulnerable: true, missing_headers_min: 2 },
    graders: {
      'vulnerable': { type: 'exact_string', case_sensitive: false, weight: 1.0 },
      'missing_headers': { type: 'array_length_min', min: 2, weight: 1.0 },
    },
    pass_threshold: 0.8,
  },
  {
    task_id: 'cyber-idor-01',
    module: 'cyber',
    description: 'Identify IDOR vulnerability on Juice Shop user API',
    difficulty: 'hard',
    tinyfish_config: {
      url: 'https://preview.owasp-juice.shop',
      goal: 'Register a test account, then try accessing /api/Users/1 and /rest/basket/2 with your auth token. Report if you can access other users data. Return JSON: {"vulnerable": boolean, "endpoints_tested": string[], "accessible_endpoints": string[], "category": string}',
      browser_profile: 'stealth',
    },
    expected_output: { vulnerable: true, category: 'A01-BrokenAccessControl' },
    graders: {
      'vulnerable': { type: 'exact_string', case_sensitive: false, weight: 1.0 },
      'category': { type: 'contains', weight: 0.5 },
      'endpoints_tested': { type: 'array_length_min', min: 1, weight: 0.5 },
    },
    pass_threshold: 0.7,
  },
  {
    task_id: 'cyber-outdated-01',
    module: 'cyber',
    description: 'Detect outdated frontend libraries on Juice Shop',
    difficulty: 'medium',
    tinyfish_config: {
      url: 'https://preview.owasp-juice.shop',
      goal: 'Inspect the page source and loaded scripts to find outdated JavaScript libraries (Angular, jQuery, etc). For each, report the version found. Return JSON: {"libraries": [{"name": string, "version": string, "outdated": boolean}], "vulnerable": boolean}',
      browser_profile: 'lite',
    },
    expected_output: { vulnerable: true, libraries_min: 1 },
    graders: {
      'vulnerable': { type: 'exact_string', case_sensitive: false, weight: 1.0 },
      'libraries': { type: 'array_length_min', min: 1, weight: 1.0 },
    },
    pass_threshold: 0.8,
  },
];

export const ALL_EVAL_TASKS: EvalTask[] = [
  ...DD_TASKS,
  ...EARNINGS_TASKS,
  ...REGULATORY_TASKS,
  ...CYBER_TASKS,
];
