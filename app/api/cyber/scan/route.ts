import { RECON_AGENT, ATTACK_AGENTS, buildGoal } from '@/lib/tinyfish/sources/cyber';
import { executeTinyFishSync } from '@/lib/tinyfish/client';
import { isMockMode, fetchOrMock } from '@/lib/data';
import { listAgents, logAgentAction, updateAgent } from '@/lib/agents/store';
import { evaluateAgent } from '@/lib/agents/engine';
import { dispatchActions } from '@/lib/actions/dispatcher';
import { runTier0, runTier1, obtainAuthToken, type CyberFinding } from '@/lib/cyber/http-checks';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Classifies a TinyFish scan result as vulnerable, not vulnerable, or inconclusive
 * based on keyword matching in the result text.
 */
function classifyFinding(result: Record<string, unknown> | null, error: string | null): string {
  if (error) return 'ERROR';
  const text = JSON.stringify(result ?? {}).toLowerCase();

  const positive = [
    'vulnerable', 'succeeded', 'bypassed', 'accessible', 'exposed',
    'injected', 'executed', 'admin panel', 'access granted', 'missing',
    'accepted', 'reflected', 'no rate limit', 'no lockout', 'enumerat',
    'outdated', 'known cve', '"vulnerable":true', '"vulnerable": true',
  ];
  const negative = [
    'blocked', 'rejected', 'denied', 'not vulnerable', 'properly escaped',
    'access denied', 'unauthorized', 'rate limited', 'locked out',
    '"vulnerable":false', '"vulnerable": false',
  ];

  const pos = positive.filter(s => text.includes(s)).length;
  const neg = negative.filter(s => text.includes(s)).length;

  if (pos > neg && pos > 0) return 'VULNERABLE';
  if (neg > pos && neg > 0) return 'NOT_VULNERABLE';
  return 'INCONCLUSIVE';
}

/**
 * Evaluates all enabled cyber agents against scan results and dispatches actions.
 * Emits AGENT_MATCHED SSE events for each matched agent.
 */
async function evaluateCyberAgents(
  facts: Record<string, unknown>,
  emit?: (event: Record<string, unknown>) => void,
): Promise<void> {
  const agents = await listAgents();
  const cyberAgents = agents.filter(a => a.module === 'cyber' && a.enabled);

  for (const agent of cyberAgents) {
    if (evaluateAgent(agent, facts)) {
      const actionResults = await dispatchActions(agent, facts);
      for (const ar of actionResults) {
        await logAgentAction({
          agent_id: agent.id,
          agent_name: agent.name,
          action_type: ar.action_type,
          target: ar.action_type === 'slack' ? (agent.actions.find(a => a.type === 'slack')?.config.channel ?? '#security') : ar.action_type,
          timestamp: ar.timestamp,
          detail: `${ar.success ? 'Sent' : 'Failed'}: ${String(facts.target ?? 'scan')} — ${String(facts.risk_level ?? 'unknown')} risk`,
        });
      }
      await updateAgent(agent.id, { last_triggered: new Date().toISOString() });
      emit?.({ type: 'AGENT_MATCHED', agent_id: agent.id, agent_name: agent.name, actions: actionResults.length });
    }
  }
}

/**
 * POST /api/cyber/scan — runs an OWASP top-10 vulnerability scan against a target URL.
 * Executes in two phases: recon first, then parallel attack agents.
 * Streams progress via SSE. After scan, evaluates cyber agents and dispatches actions.
 */
export async function POST(req: Request) {
  const { target } = await req.json();

  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing target URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isMockMode()) {
    const mockData = await fetchOrMock('cyber', async () => ({}));
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const mockFindings = (mockData as Record<string, unknown>).findings as Array<Record<string, unknown>> ?? [];

    (async () => {
      const send = async (event: Record<string, unknown>) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      await send({ type: 'STARTED', mock: true, target, total_agents: 10 });

      await send({ type: 'RECON_START', agent: 'recon-api' });
      await new Promise(r => setTimeout(r, 400));
      await send({ type: 'RECON_COMPLETE', agent: 'recon-api', status: 'success' });

      for (const finding of mockFindings) {
        await send({ type: 'ATTACK_START', agent: finding.id, name: finding.name });
        await new Promise(r => setTimeout(r, 200));
        await send({
          type: 'ATTACK_COMPLETE',
          agent: finding.id,
          name: finding.name,
          status: finding.status,
          severity: finding.severity,
          category: finding.category,
          summary: finding.summary,
        });
      }

      await new Promise(r => setTimeout(r, 200));

      const mockSynthesis = (mockData as Record<string, unknown>).synthesis as Record<string, unknown> ?? {};
      await evaluateCyberAgents(
        { target, ...mockSynthesis },
        (event) => send(event),
      );

      await send({ type: 'COMPLETE', status: 'success', result: mockData });
      await writer.close();
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // TinyFish-only agents — everything else is handled by HTTP tiers
  const TINYFISH_AGENTS = ATTACK_AGENTS.filter(a =>
    ['file-upload', 'ssrf', 'input-boundary'].includes(a.id),
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const startTime = Date.now();
      const allFindings: CyberFinding[] = [];
      emit({ type: 'STARTED', target, total_agents: 10 });

      // ── Tier 0: Plain HTTP checks ($0, <2s) ──────────────
      emit({ type: 'TIER_START', tier: 0, description: 'HTTP header & endpoint probes' });

      const tier0Results = await runTier0(target);
      for (const f of tier0Results) {
        allFindings.push(f);
        emit({
          type: 'ATTACK_COMPLETE', tier: 0,
          agent: f.id, name: f.name,
          status: f.status, severity: f.severity,
          category: f.category, summary: f.summary,
        });
      }

      emit({ type: 'TIER_COMPLETE', tier: 0, checks: tier0Results.length, duration_ms: Date.now() - startTime });

      // ── Tier 1: Auth-based HTTP checks ($0, <10s) ─────────
      emit({ type: 'TIER_START', tier: 1, description: 'Authenticated API probes' });

      const auth = await obtainAuthToken(target);
      if (auth) {
        const tier1Results = await runTier1(target, auth.token, auth.userId);
        for (const f of tier1Results) {
          allFindings.push(f);
          emit({
            type: 'ATTACK_COMPLETE', tier: 1,
            agent: f.id, name: f.name,
            status: f.status, severity: f.severity,
            category: f.category, summary: f.summary,
          });
        }
        emit({ type: 'TIER_COMPLETE', tier: 1, checks: tier1Results.length, auth: true });
      } else {
        emit({ type: 'TIER_COMPLETE', tier: 1, checks: 0, auth: false, reason: 'Could not obtain auth token — skipping authenticated checks' });
      }

      // ── Tier 2: TinyFish browser agents (only for checks that need a real browser) ──
      const tier0Vulns = tier0Results.filter(f => f.status === 'VULNERABLE').length;
      const tier1Vulns = allFindings.filter(f => f.status === 'VULNERABLE').length;
      const shouldRunTier2 = tier0Vulns > 0 || tier1Vulns > 0 || !auth;

      if (shouldRunTier2 && TINYFISH_AGENTS.length > 0) {
        emit({ type: 'TIER_START', tier: 2, description: 'TinyFish browser agents for interactive tests' });

        // Run recon first
        emit({ type: 'RECON_START', agent: RECON_AGENT.id });
        let reconData = '';
        let reconResult: Record<string, unknown> = {};
        try {
          const reconGoal = buildGoal(RECON_AGENT.goals[0], target);
          const response = await executeTinyFishSync(target, reconGoal, 'stealth');
          reconResult = response.result ?? {};
          reconData = JSON.stringify(reconResult).slice(0, 4000);
          emit({ type: 'RECON_COMPLETE', agent: RECON_AGENT.id, status: 'success' });
        } catch (err) {
          emit({ type: 'RECON_COMPLETE', agent: RECON_AGENT.id, status: 'error', error: String(err) });
        }

        // Run TinyFish attack agents with concurrency limit
        const concurrency = parseInt(process.env.TINYFISH_CONCURRENCY ?? '2', 10);
        let running = 0;
        let idx = 0;

        await new Promise<void>((resolve) => {
          const runNext = () => {
            if (idx >= TINYFISH_AGENTS.length && running === 0) { resolve(); return; }

            while (running < concurrency && idx < TINYFISH_AGENTS.length) {
              const agent = TINYFISH_AGENTS[idx++];
              running++;

              (async () => {
                emit({ type: 'ATTACK_START', tier: 2, agent: agent.id, name: agent.name });

                let prevResult = '';
                let lastResult: Record<string, unknown> | null = null;
                let lastError: string | null = null;
                const iterStart = Date.now();

                for (const goalTemplate of agent.goals) {
                  const goal = buildGoal(goalTemplate, target, reconData, prevResult);
                  try {
                    const response = await executeTinyFishSync(target, goal, 'stealth');
                    lastResult = response.result;
                    lastError = response.error;
                    prevResult = JSON.stringify(response.result ?? {}).slice(0, 2000);
                  } catch (err) {
                    lastError = String(err);
                    prevResult = `Error: ${lastError}`;
                  }
                }

                const classification = classifyFinding(lastResult, lastError);
                const finding: CyberFinding = {
                  id: agent.id,
                  name: agent.name,
                  category: agent.category,
                  severity: agent.severity,
                  status: classification as CyberFinding['status'],
                  duration_ms: Date.now() - iterStart,
                  summary: lastResult ? JSON.stringify(lastResult).slice(0, 500) : lastError ?? 'No data',
                  evidence: lastResult ? JSON.stringify(lastResult).slice(0, 1000) : null,
                };

                allFindings.push(finding);
                emit({
                  type: 'ATTACK_COMPLETE', tier: 2,
                  agent: agent.id, name: agent.name,
                  status: classification, severity: agent.severity,
                  category: agent.category, summary: finding.summary,
                });

                running--;
                runNext();
              })();
            }
          };
          runNext();
        });

        emit({ type: 'TIER_COMPLETE', tier: 2, checks: TINYFISH_AGENTS.length });
      } else {
        emit({ type: 'TIER_SKIP', tier: 2, reason: 'Tier 0/1 found no issues and auth succeeded — skipping expensive browser checks' });
      }

      // ── Synthesis ──────────────────────────────────────────
      const vulnCount = allFindings.filter(f => f.status === 'VULNERABLE').length;
      const notVulnCount = allFindings.filter(f => f.status === 'NOT_VULNERABLE').length;
      const criticalCount = allFindings.filter(f => f.status === 'VULNERABLE' && f.severity === 'Critical').length;
      const highCount = allFindings.filter(f => f.status === 'VULNERABLE' && f.severity === 'High').length;

      const mediumCount = allFindings.filter(f => f.status === 'VULNERABLE' && f.severity === 'Medium').length;

      const owaspCoverage: Record<string, string> = {};
      for (const f of allFindings) {
        if (f.category && !owaspCoverage[f.category]) {
          owaspCoverage[f.category] = f.status;
        }
      }

      const vulnFindings = allFindings.filter(f => f.status === 'VULNERABLE');
      const topPriority = vulnFindings
        .filter(f => f.severity === 'Critical' || f.severity === 'High')
        .slice(0, 3)
        .map(f => `${f.name}: ${f.severity} — ${f.category}`);

      const finalResult = {
        target,
        generated_at: new Date().toISOString(),
        scan_duration_ms: Date.now() - startTime,
        total_agents: allFindings.length,
        findings: allFindings,
        synthesis: {
          risk_score: Math.min(10, criticalCount * 3 + highCount * 2 + vulnCount),
          risk_level: criticalCount > 0 ? 'CRITICAL' : highCount > 0 ? 'HIGH' : vulnCount > 0 ? 'MEDIUM' : 'LOW',
          vulnerabilities_found: vulnCount,
          not_vulnerable: notVulnCount,
          critical_count: criticalCount,
          high_count: highCount,
          medium_count: mediumCount,
          top_priority: topPriority,
          owasp_coverage: owaspCoverage,
        },
      };

      await evaluateCyberAgents(
        { target, ...finalResult.synthesis },
        (event) => emit(event as Record<string, unknown>),
      );

      emit({ type: 'COMPLETE', status: 'success', result: finalResult });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
