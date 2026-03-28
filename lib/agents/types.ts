import { z } from 'zod';

export const ConditionCheckSchema = z.object({
  fact: z.string(),
  operator: z.enum(['equal', 'notEqual', 'contains', 'greaterThan', 'lessThan', 'in']),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const ConditionsSchema = z.object({
  operator: z.enum(['all', 'any']),
  checks: z.array(ConditionCheckSchema),
});

export const ActionConfigSchema = z.object({
  type: z.enum(['slack', 'email', 'sheet', 'webhook', 'telegram']),
  config: z.record(z.string(), z.string()),
});

export const FishConfigSchema = z.object({
  species: z.enum(['auto', 'clownfish', 'angelfish', 'pufferfish', 'tinyfish', 'tinyfish_coder', 'tinyfish_matrix']).default('auto'),
  colour: z.string().default('auto'),
  accessory: z.enum(['none', 'top_hat', 'party_hat', 'crown', 'beanie', 'glasses', 'monocle', 'bow_tie', 'scarf']).default('none'),
});

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  module: z.enum(['regulatory', 'due_diligence', 'earnings', 'cyber']),
  conditions: ConditionsSchema,
  actions: z.array(ActionConfigSchema),
  fish_config: FishConfigSchema,
  fish_sprite: z.string(),
  created_at: z.string(),
  last_triggered: z.string().nullable(),
});

export const CreateAgentSchema = AgentSchema.omit({
  id: true,
  fish_sprite: true,
  created_at: true,
  last_triggered: true,
});

export type FishConfig = z.infer<typeof FishConfigSchema>;

export type Agent = z.infer<typeof AgentSchema>;
export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type ConditionCheck = z.infer<typeof ConditionCheckSchema>;

export interface AgentAction {
  agent_id: string;
  agent_name: string;
  action_type: string;
  target: string;
  timestamp: string;
  detail: string;
}
