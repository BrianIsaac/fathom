import { createAgent, logAgentAction, listAgents } from './store';
import type { CreateAgentInput } from './types';

const SEED_AGENTS: CreateAgentInput[] = [
  {
    name: 'MAS Compliance Monitor',
    enabled: true,
    module: 'regulatory',
    conditions: { operator: 'all', checks: [
      { fact: 'regulator', operator: 'equal', value: 'MAS' },
      { fact: 'relevance_score', operator: 'greaterThan', value: 7 },
    ]},
    actions: [
      { type: 'slack', config: { channel: '#fathom-alerts', template: '{title}' } },
      { type: 'email', config: { to: 'isaacbikjk@gmail.com', template: '{title}' } },
    ],
    fish_config: { species: 'clownfish', colour: 'auto', accessory: 'top_hat' },
  },
  {
    name: 'Earnings Beat Alert',
    enabled: true,
    module: 'earnings',
    conditions: { operator: 'all', checks: [
      { fact: 'eps_surprise_pct', operator: 'greaterThan', value: 5 },
    ]},
    actions: [
      { type: 'telegram', config: { chat_id: '348165044', template: '{ticker} beat!' } },
    ],
    fish_config: { species: 'pufferfish', colour: '50', accessory: 'party_hat' },
  },
  {
    name: 'DD Risk Watchdog',
    enabled: true,
    module: 'due_diligence',
    conditions: { operator: 'any', checks: [
      { fact: 'risk_score', operator: 'greaterThan', value: 7 },
      { fact: 'red_flags_count', operator: 'greaterThan', value: 2 },
    ]},
    actions: [
      { type: 'slack', config: { channel: '#fathom-alerts', template: 'Risk alert: {company}' } },
    ],
    fish_config: { species: 'angelfish', colour: '270', accessory: 'monocle' },
  },
  {
    name: 'FCA Watcher',
    enabled: false,
    module: 'regulatory',
    conditions: { operator: 'all', checks: [
      { fact: 'regulator', operator: 'equal', value: 'FCA' },
    ]},
    actions: [
      { type: 'webhook', config: { url: 'https://hooks.example.com/fca' } },
    ],
    fish_config: { species: 'clownfish', colour: '320', accessory: 'crown' },
  },
  {
    name: 'OWASP Vulnerability Scanner',
    enabled: true,
    module: 'cyber',
    conditions: { operator: 'any', checks: [
      { fact: 'risk_score', operator: 'greaterThan', value: 5 },
      { fact: 'critical_count', operator: 'greaterThan', value: 0 },
    ]},
    actions: [
      { type: 'slack', config: { channel: '#fathom-alerts', template: 'Vulnerability scan: {target} — risk {risk_score}/10' } },
      { type: 'email', config: { to: 'isaacbikjk@gmail.com', template: '{target} scan complete — {risk_level}' } },
    ],
    fish_config: { species: 'pufferfish', colour: '0', accessory: 'glasses' },
  },
];

/**
 * Seeds the agent store with demo agents and activity history.
 * Idempotent: skips if agents already exist.
 *
 * Returns:
 *   The list of agents (either newly created or existing).
 */
export async function seedIfEmpty() {
  const existing = await listAgents();
  if (existing.length > 0) return existing;

  const created = [];
  for (const input of SEED_AGENTS) {
    const agent = await createAgent(input);
    created.push(agent);
  }

  const now = Date.now();
  const mockActions = [
    { agent_id: created[0].id, agent_name: created[0].name, action_type: 'slack', target: '#fathom-alerts', timestamp: new Date(now - 7200000).toISOString(), detail: 'MAS consultation paper on DPT services — relevance 9/10' },
    { agent_id: created[0].id, agent_name: created[0].name, action_type: 'email', target: 'isaacbikjk@gmail.com', timestamp: new Date(now - 7100000).toISOString(), detail: 'MAS consultation paper on DPT services — relevance 9/10' },
    { agent_id: created[0].id, agent_name: created[0].name, action_type: 'slack', target: '#fathom-alerts', timestamp: new Date(now - 3600000).toISOString(), detail: 'MAS circular on insurance distribution channels — relevance 7/10' },
    { agent_id: created[0].id, agent_name: created[0].name, action_type: 'email', target: 'isaacbikjk@gmail.com', timestamp: new Date(now - 3500000).toISOString(), detail: 'MAS circular on insurance distribution channels — relevance 7/10' },
    { agent_id: created[1].id, agent_name: created[1].name, action_type: 'telegram', target: 'Brian', timestamp: new Date(now - 5400000).toISOString(), detail: 'GRAB beat EPS by +200% — Q4 2025 earnings surprise' },
    { agent_id: created[1].id, agent_name: created[1].name, action_type: 'telegram', target: 'Brian', timestamp: new Date(now - 5300000).toISOString(), detail: 'SE beat EPS by +14.3% — Shopee profitability inflecting' },
    { agent_id: created[2].id, agent_name: created[2].name, action_type: 'slack', target: '#fathom-alerts', timestamp: new Date(now - 1800000).toISOString(), detail: 'Risk alert: Acme Corp — risk score 8/10, 3 red flags detected' },
    { agent_id: created[2].id, agent_name: created[2].name, action_type: 'slack', target: '#fathom-alerts', timestamp: new Date(now - 900000).toISOString(), detail: 'DD complete: Grab Holdings — risk score 3/10, LOW-MEDIUM risk' },
    { agent_id: created[4].id, agent_name: created[4].name, action_type: 'slack', target: '#fathom-alerts', timestamp: new Date(now - 2700000).toISOString(), detail: 'Scan complete: api.staging.example.com — CRITICAL, 3 critical vulns found' },
    { agent_id: created[4].id, agent_name: created[4].name, action_type: 'email', target: 'isaacbikjk@gmail.com', timestamp: new Date(now - 2600000).toISOString(), detail: 'Scan complete: api.staging.example.com — CRITICAL risk, IDOR + JWT + SSRF' },
  ];

  for (const action of mockActions) {
    await logAgentAction(action);
  }

  return created;
}
