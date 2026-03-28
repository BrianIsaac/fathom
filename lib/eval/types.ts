import { z } from 'zod';

export const FieldGraderSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('exact_string'),
    case_sensitive: z.boolean().default(false),
    weight: z.number().default(1.0),
  }),
  z.object({
    type: z.literal('numeric_tolerance'),
    tolerance: z.number(),
    tolerance_type: z.enum(['absolute', 'percentage']).default('absolute'),
    weight: z.number().default(1.0),
  }),
  z.object({
    type: z.literal('contains'),
    weight: z.number().default(1.0),
  }),
  z.object({
    type: z.literal('array_length_min'),
    min: z.number(),
    weight: z.number().default(1.0),
  }),
  z.object({
    type: z.literal('not_null'),
    weight: z.number().default(0.5),
  }),
  z.object({
    type: z.literal('date_match'),
    format: z.string().default('YYYY-MM-DD'),
    weight: z.number().default(1.0),
  }),
]);

export const EvalTaskSchema = z.object({
  task_id: z.string(),
  module: z.enum(['due_diligence', 'earnings', 'regulatory']),
  description: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tinyfish_config: z.object({
    url: z.string().url(),
    goal: z.string(),
    browser_profile: z.enum(['lite', 'stealth']).default('lite'),
  }),
  expected_output: z.record(z.string(), z.unknown()),
  graders: z.record(z.string(), FieldGraderSchema),
  pass_threshold: z.number().default(0.8),
});

export const EvalResultSchema = z.object({
  task_id: z.string(),
  trial: z.number(),
  status: z.enum(['passed', 'failed', 'error']),
  accuracy: z.number().min(0).max(1),
  latency_ms: z.number(),
  steps_used: z.number().nullable(),
  fields_expected: z.number(),
  fields_correct: z.number(),
  fields_missing: z.number(),
  field_scores: z.record(z.string(), z.object({
    expected: z.unknown(),
    actual: z.unknown(),
    score: z.number(),
    grader_type: z.string(),
  })),
  error: z.string().nullable(),
  failure_category: z.enum([
    'anti_bot',
    'timeout',
    'extraction_error',
    'site_changed',
    'grader_error',
  ]).nullable(),
});

export const EvalRunSchema = z.object({
  eval_run_id: z.string(),
  generated_at: z.string().datetime(),
  total_tasks: z.number(),
  total_trials: z.number(),
  passed: z.number(),
  failed: z.number(),
  pass_rate: z.number(),
  avg_latency_ms: z.number(),
  avg_accuracy: z.number(),
  total_cost_steps: z.number(),
  results: z.array(EvalResultSchema),
  by_module: z.record(z.string(), z.object({
    tasks: z.number(),
    passed: z.number(),
    pass_rate: z.number(),
    avg_accuracy: z.number(),
  })),
  by_failure_category: z.record(z.string(), z.number()),
});

export type FieldGrader = z.infer<typeof FieldGraderSchema>;
export type EvalTask = z.infer<typeof EvalTaskSchema>;
export type EvalResult = z.infer<typeof EvalResultSchema>;
export type EvalRun = z.infer<typeof EvalRunSchema>;
