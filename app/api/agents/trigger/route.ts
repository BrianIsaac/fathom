import { NextResponse } from 'next/server';
import { listAgents, logAgentAction, updateAgent } from '@/lib/agents/store';
import { evaluateAgent } from '@/lib/agents/engine';
import { dispatchActions, type ActionResult } from '@/lib/actions/dispatcher';
import { isMockMode } from '@/lib/data';
import { seedIfEmpty } from '@/lib/agents/seed-data';

export const dynamic = 'force-dynamic';

/**
 * Mock facts per module — simulates what real extraction would produce.
 */
const MOCK_FACTS: Record<string, Record<string, unknown>> = {
  regulatory: {
    regulator: 'MAS',
    jurisdiction: 'SG',
    relevance_score: 9,
    affected_domains: ['digital payments', 'retail FX'],
    title: 'Consultation Paper on Digital Payment Token Services',
    document_type: 'Consultation Paper',
  },
  due_diligence: {
    risk_score: 8,
    risk_level: 'HIGH',
    red_flags_count: 3,
    company: 'Acme Corp',
    title: 'Acme Corp risk assessment — 3 red flags detected',
  },
  earnings: {
    ticker: 'GRAB',
    eps_surprise_pct: 200,
    eps_actual: 0.03,
    eps_consensus: 0.01,
    title: 'GRAB beat EPS estimate by +200%',
    company_name: 'Grab Holdings',
  },
  cyber: {
    target: 'api.staging.example.com',
    risk_score: 8,
    risk_level: 'CRITICAL',
    critical_count: 3,
    high_count: 5,
    title: 'OWASP scan: 3 critical vulnerabilities detected',
    findings_count: 10,
  },
};

/**
 * POST /api/agents/trigger — evaluates all enabled agents against mock facts
 * and dispatches their actions. Returns which agents fired and what actions were logged.
 *
 * Use this to test the full agent → action → activity pipeline without real data.
 */
export async function POST() {
  let agents = await listAgents();
  if (agents.length === 0 && isMockMode()) {
    agents = await seedIfEmpty();
  }
  const results: Array<{
    agent: string;
    module: string;
    matched: boolean;
    actions_fired: string[];
    action_results: ActionResult[];
  }> = [];

  for (const agent of agents) {
    const facts = MOCK_FACTS[agent.module] ?? {};
    const matched = evaluateAgent(agent, facts);

    const actionsFired: string[] = [];
    let actionResults: ActionResult[] = [];

    if (matched) {
      for (const action of agent.actions) {
        const target = action.config.channel ?? action.config.to ?? action.config.chat_id ?? action.config.url ?? 'unknown';
        await logAgentAction({
          agent_id: agent.id,
          agent_name: agent.name,
          action_type: action.type,
          target,
          timestamp: new Date().toISOString(),
          detail: `${action.type} → ${target}: ${String(facts.title ?? 'triggered')}`,
        });
        actionsFired.push(`${action.type} → ${target}`);
      }

      actionResults = await dispatchActions(agent, facts);
      await updateAgent(agent.id, { last_triggered: new Date().toISOString() });
    }

    results.push({
      agent: agent.name,
      module: agent.module,
      matched,
      actions_fired: actionsFired,
      action_results: actionResults,
    });
  }

  return NextResponse.json({
    triggered_at: new Date().toISOString(),
    agents_evaluated: results.length,
    agents_matched: results.filter(r => r.matched).length,
    results,
  });
}
