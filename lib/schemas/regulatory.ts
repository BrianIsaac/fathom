import { z } from 'zod';

export const RegulatoryPublicationSchema = z.object({
  title: z.string(),
  regulator: z.string(),
  jurisdiction: z.string(),
  date: z.string(),
  document_type: z.string(),
  url: z.string(),
  relevance_score: z.number().min(1).max(10),
  affected_domains: z.array(z.string()),
  comment_deadline: z.string().nullable(),
  summary: z.string(),
});

export const RegulatorySynthesisSchema = z.object({
  urgent_actions: z.array(z.string()),
  monitoring_items: z.array(z.string()),
  informational: z.array(z.string()),
});

export const RegulatoryResultSchema = z.object({
  generated_at: z.string().datetime(),
  regulators_queried: z.number(),
  regulators_returned: z.number(),
  publications_found: z.number(),
  high_relevance: z.number(),
  scan_latency_ms: z.number(),
  business_domains: z.array(z.string()),
  publications: z.array(RegulatoryPublicationSchema),
  synthesis: RegulatorySynthesisSchema,
});

export type RegulatoryPublication = z.infer<typeof RegulatoryPublicationSchema>;
export type RegulatorySynthesis = z.infer<typeof RegulatorySynthesisSchema>;
export type RegulatoryResult = z.infer<typeof RegulatoryResultSchema>;
