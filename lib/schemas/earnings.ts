import { z } from 'zod';

export const EarningsFinancialsSchema = z.object({
  eps_actual: z.number().nullable(),
  eps_consensus: z.number().nullable(),
  eps_surprise: z.string().nullable(),
  revenue_actual: z.string().nullable(),
  revenue_consensus: z.string().nullable(),
  revenue_surprise: z.string().nullable(),
  guidance: z.string().nullable(),
});

export const EarningsTickerResultSchema = z.object({
  ticker: z.string(),
  company_name: z.string(),
  report_date: z.string().nullable(),
  fiscal_quarter: z.string().nullable(),
  latency_ms: z.number(),
  financials: EarningsFinancialsSchema,
  analyst_tone: z.string().nullable(),
  source_urls: z.array(z.string()),
  status: z.enum(['success', 'partial', 'failed']),
});

export const EarningsResultSchema = z.object({
  generated_at: z.string().datetime(),
  tickers_queried: z.number(),
  tickers_returned: z.number(),
  total_latency_ms: z.number(),
  earnings: z.array(EarningsTickerResultSchema),
});

export type EarningsResult = z.infer<typeof EarningsResultSchema>;
export type EarningsTickerResult = z.infer<typeof EarningsTickerResultSchema>;
