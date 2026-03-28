import { NextResponse } from 'next/server';
import { createAgent, logAgentAction, listAgents } from '@/lib/agents/store';
import type { CreateAgentInput } from '@/lib/agents/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/agents/seed — seeds mock agents and activity for UAT testing.
 * Idempotent: skips if agents already exist.
 */
export async function POST() {
  const existing = await listAgents();
  if (existing.length > 0) {
    return NextResponse.json({ seeded: false, reason: 'Agents already exist', count: existing.length });
  }

  const agents: CreateAgentInput[] = [
    {
      name: 'MAS Compliance Monitor',
      enabled: true,
      module: 'regulatory' as const,
      conditions: { operator: 'all' as const, checks: [
        { fact: 'regulator', operator: 'equal' as const, value: 'MAS' },
        { fact: 'relevance_score', operator: 'greaterThan' as const, value: 7 },
      ]},
      actions: [
        { type: 'slack' as const, config: { channel: '#compliance-alerts', template: '{title}' } },
        { type: 'email' as const, config: { to: 'compliance@company.com', template: '{title}' } },
      ],
      fish_config: { species: 'clownfish' as const, colour: 'auto', accessory: 'top_hat' as const },
    },
    {
      name: 'Earnings Beat Alert',
      enabled: true,
      module: 'earnings' as const,
      conditions: { operator: 'all' as const, checks: [
        { fact: 'eps_surprise_pct', operator: 'greaterThan' as const, value: 5 },
      ]},
      actions: [
        { type: 'telegram' as const, config: { chat_id: '12345', template: '{ticker} beat!' } },
      ],
      fish_config: { species: 'pufferfish' as const, colour: '50', accessory: 'party_hat' as const },
    },
    {
      name: 'DD Risk Watchdog',
      enabled: true,
      module: 'due_diligence' as const,
      conditions: { operator: 'any' as const, checks: [
        { fact: 'risk_score', operator: 'greaterThan' as const, value: 7 },
        { fact: 'red_flags_count', operator: 'greaterThan' as const, value: 2 },
      ]},
      actions: [
        { type: 'slack' as const, config: { channel: '#risk-team', template: 'Risk alert: {company}' } },
      ],
      fish_config: { species: 'angelfish' as const, colour: '270', accessory: 'monocle' as const },
    },
    {
      name: 'FCA Watcher',
      enabled: false,
      module: 'regulatory' as const,
      conditions: { operator: 'all' as const, checks: [
        { fact: 'regulator', operator: 'equal' as const, value: 'FCA' },
      ]},
      actions: [
        { type: 'webhook' as const, config: { url: 'https://hooks.example.com/fca' } },
      ],
      fish_config: { species: 'clownfish' as const, colour: '320', accessory: 'crown' as const },
    },
  ];

  const created = [];
  for (const input of agents) {
    const agent = await createAgent(input);
    created.push(agent);
  }

  // Pre-populate activity history for demo — simulates a "7am" sentry run
  const now = Date.now();
  const mockActions = [
    { agent_id: created[0].id, agent_name: created[0].name, action_type: 'slack', target: '#compliance-alerts', timestamp: new Date(now - 7200000).toISOString(), detail: 'MAS consultation paper on DPT services — relevance 9/10' },
    { agent_id: created[0].id, agent_name: created[0].name, action_type: 'email', target: 'compliance@company.com', timestamp: new Date(now - 7100000).toISOString(), detail: 'MAS consultation paper on DPT services — relevance 9/10' },
    { agent_id: created[0].id, agent_name: created[0].name, action_type: 'slack', target: '#compliance-alerts', timestamp: new Date(now - 3600000).toISOString(), detail: 'MAS circular on insurance distribution channels — relevance 7/10' },
    { agent_id: created[0].id, agent_name: created[0].name, action_type: 'email', target: 'compliance@company.com', timestamp: new Date(now - 3500000).toISOString(), detail: 'MAS circular on insurance distribution channels — relevance 7/10' },
    { agent_id: created[1].id, agent_name: created[1].name, action_type: 'telegram', target: 'chat:12345', timestamp: new Date(now - 5400000).toISOString(), detail: 'GRAB beat EPS by +200% — Q4 2025 earnings surprise' },
    { agent_id: created[1].id, agent_name: created[1].name, action_type: 'telegram', target: 'chat:12345', timestamp: new Date(now - 5300000).toISOString(), detail: 'SE beat EPS by +14.3% — Shopee profitability inflecting' },
    { agent_id: created[2].id, agent_name: created[2].name, action_type: 'slack', target: '#risk-team', timestamp: new Date(now - 1800000).toISOString(), detail: 'Risk alert: Acme Corp — risk score 8/10, 3 red flags detected' },
    { agent_id: created[2].id, agent_name: created[2].name, action_type: 'slack', target: '#risk-team', timestamp: new Date(now - 900000).toISOString(), detail: 'DD complete: Grab Holdings — risk score 3/10, LOW-MEDIUM risk' },
  ];

  for (const action of mockActions) {
    await logAgentAction(action);
  }

  return NextResponse.json({
    seeded: true,
    agents: created.length,
    actions: mockActions.length,
    agent_names: created.map(a => a.name),
  });
}
