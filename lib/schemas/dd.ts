import { z } from 'zod';

export const DDSourceResultSchema = z.object({
  source_id: z.string(),
  source_name: z.string(),
  status: z.enum(['success', 'failed', 'timeout', 'blocked']),
  latency_ms: z.number(),
  data: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
});

export const DDRedFlagSchema = z.object({
  severity: z.enum(['low', 'medium', 'high']),
  source: z.string(),
  detail: z.string(),
});

export const DDSynthesisSchema = z.object({
  risk_score: z.number().min(1).max(10),
  risk_level: z.enum(['LOW', 'LOW-MEDIUM', 'MEDIUM', 'MEDIUM-HIGH', 'HIGH']),
  summary: z.string(),
  red_flags: z.array(DDRedFlagSchema),
  key_facts: z.array(z.string()),
  data_completeness: z.string(),
  citations: z.array(z.object({
    fact: z.string(),
    source: z.string(),
  })),
});

export const DDResultSchema = z.object({
  company: z.string(),
  jurisdiction: z.string(),
  generated_at: z.string().datetime(),
  sources_queried: z.number(),
  sources_returned: z.number(),
  sources_failed: z.number(),
  extraction_latency_ms: z.number(),
  sources: z.record(z.string(), DDSourceResultSchema),
  synthesis: DDSynthesisSchema,
});

export type DDResult = z.infer<typeof DDResultSchema>;
export type DDSourceResult = z.infer<typeof DDSourceResultSchema>;
export type DDSynthesis = z.infer<typeof DDSynthesisSchema>;
