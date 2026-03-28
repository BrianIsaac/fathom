import { NextResponse } from 'next/server';
import { runAllCascades, type SentrySource } from '@/lib/sentry/runner';
import { REGULATORY_SOURCES } from '@/lib/tinyfish/sources/regulatory';
import { createMultiplexedResponse } from '@/lib/tinyfish/multiplexer';
import { normalisePublications } from '@/lib/regulatory/normalise';
import { fetchRSSSources, type NormalisedPublication } from '@/lib/regulatory/rss-sources';
import { synthesiseRegulatory } from '@/lib/openai/synthesise';
import { listAgents, logAgentAction, updateAgent } from '@/lib/agents/store';
import { evaluateAgent } from '@/lib/agents/engine';
import { dispatchActions } from '@/lib/actions/dispatcher';
import { isMockMode, fetchOrMock } from '@/lib/data';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * Builds sentry sources from the regulatory source config.
 */
function buildSentrySources(): SentrySource[] {
  return REGULATORY_SOURCES.map(s => ({
    id: s.id,
    name: `${s.regulator} (${s.jurisdiction})`,
    url: s.url,
    type: 'tinyfish' as const,
  }));
}

/**
 * GET handler -- triggered by Vercel cron (daily at 7am SGT).
 * Runs the tier cascade for all regulatory sources, returns JSON summary.
 */
export async function GET() {
  if (isMockMode()) {
    const mockData = await fetchOrMock('regulatory', async () => ({}));
    return NextResponse.json({
      mock: true,
      ...mockData,
    });
  }

  const sources = buildSentrySources();
  const results = await runAllCascades(sources);

  const changed = results.filter(r => r.change_detected);
  const errors = results.filter(r => r.error !== null);

  // Evaluate agents against changed sources
  if (changed.length > 0) {
    const agents = await listAgents();
    const regulatoryAgents = agents.filter(a => a.module === 'regulatory' && a.enabled);

    for (const result of changed) {
      const facts: Record<string, unknown> = {
        source: result.source_id,
        change_detected: true,
        tier_reached: result.tier_reached,
      };
      for (const agent of regulatoryAgents) {
        if (evaluateAgent(agent, facts)) {
          const actionResults = await dispatchActions(agent, facts);
          for (const ar of actionResults) {
            await logAgentAction({
              agent_id: agent.id,
              agent_name: agent.name,
              action_type: ar.action_type,
              target: ar.action_type === 'slack' ? '#channel' : ar.action_type,
              timestamp: ar.timestamp,
              detail: `${ar.success ? 'Sent' : 'Failed'}: change on ${result.source_id}`,
            });
          }
          await updateAgent(agent.id, { last_triggered: new Date().toISOString() });
        }
      }
    }
  }

  return NextResponse.json({
    checked_at: new Date().toISOString(),
    sources_checked: results.length,
    changes_detected: changed.length,
    errors: errors.length,
    results,
  });
}

/**
 * POST handler -- manual trigger from the frontend.
 * Runs full extraction via the multiplexed SSE pattern, including GPT synthesis.
 */
export async function POST(req: Request) {
  if (isMockMode()) {
    const mockData = await fetchOrMock('regulatory', async () => ({}));
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const mockSources = [
      { id: 'mas_publications', name: 'MAS', delay: 300 },
      { id: 'mas_news', name: 'MAS News', delay: 250 },
      { id: 'sec_press', name: 'SEC', delay: 400 },
      { id: 'hkma_circulars', name: 'HKMA', delay: 350 },
      { id: 'fca_publications', name: 'FCA', delay: 300 },
      { id: 'sgx_regco', name: 'SGX RegCo', delay: 200 },
    ];

    (async () => {
      const send = async (event: Record<string, unknown>) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      await send({ type: 'STARTED', mock: true, sources: mockSources.map(s => s.id) });

      for (const source of mockSources) {
        await send({ type: 'TIER_CHECK', tier: 0, source: source.id, status: 'skip' });
        await new Promise(r => setTimeout(r, 100));
        await send({ type: 'TIER_CHECK', tier: 1, source: source.id, status: 'escalated' });
        await new Promise(r => setTimeout(r, 100));
        await send({ type: 'TIER_CHECK', tier: 2, source: source.id, status: 'running' });
        await send({ type: 'SOURCE_START', source: source.id });
        await new Promise(r => setTimeout(r, source.delay));
        await send({ type: 'SOURCE_STEP', source: source.id, detail: `Extracting from ${source.name}...` });
        await new Promise(r => setTimeout(r, source.delay));
        await send({ type: 'TIER_CHECK', tier: 2, source: source.id, status: 'pass' });
        await send({ type: 'SOURCE_COMPLETE', source: source.id, status: 'success', latency_ms: source.delay * 2 });
      }

      await send({ type: 'SYNTHESISING' });
      await new Promise(r => setTimeout(r, 200));

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

  const body = await req.json();
  const businessDomains: string[] = body.business_domains ?? ['digital payments', 'retail FX', 'insurance'];
  const jurisdictions: string[] = body.jurisdictions ?? ['SG', 'US', 'HK', 'UK', 'INT'];

  const jurisdictionMap: Record<string, string[]> = {
    'SG': ['mas_publications', 'mas_news', 'sgx_regco'],
    'US': ['sec_press'],
    'HK': ['hkma_brdr'],
    'UK': ['fca_publications'],
    'INT': ['bis_publications'],
  };

  const activeSourceIds = new Set(
    jurisdictions.flatMap(j => jurisdictionMap[j] ?? [])
  );

  const sources = REGULATORY_SOURCES
    .filter(s => activeSourceIds.has(s.id))
    .map(s => ({
      id: s.id,
      name: `${s.regulator} (${s.jurisdiction})`,
      request: {
        url: s.url,
        goal: s.goal,
        browser_profile: s.browserProfile as 'lite' | 'stealth',
        ...(s.proxyEnabled ? { proxy_config: { enabled: true } } : {}),
      },
    }));

  return createMultiplexedResponse({
    sources,
    synthesise: async (results) => {
      const tinyfishPubs: NormalisedPublication[] = results
        .filter(r => r.status === 'success' && r.data)
        .flatMap(r => {
          const source = REGULATORY_SOURCES.find(s => s.id === r.source_id)!;
          return normalisePublications(source, r.data!);
        });

      // RSS fallback: only fetch for sources where TinyFish failed
      const succeededIds = new Set(results.filter(r => r.status === 'success').map(r => r.source_id));
      const skipRssIds = new Set<string>();
      for (const src of REGULATORY_SOURCES) {
        if (succeededIds.has(src.id) && src.rssFallbackId) {
          skipRssIds.add(src.rssFallbackId);
        }
      }
      const rssPubs = await fetchRSSSources(jurisdictions, skipRssIds);
      const allPubs = [...tinyfishPubs, ...rssPubs];

      let synthesis: { urgent_actions: string[]; monitoring_items: string[]; informational: string[] } = { urgent_actions: [], monitoring_items: [], informational: [] };
      try {
        const pubRecords = allPubs.map(p => ({ ...p }) as unknown as Record<string, unknown>);
        synthesis = await synthesiseRegulatory(businessDomains, pubRecords) as typeof synthesis;
      } catch {
        // GPT synthesis failed — continue with empty synthesis
      }

      const agents = await listAgents();
      const regulatoryAgents = agents.filter(a => a.module === 'regulatory' && a.enabled);

      for (const pub of allPubs) {
        const facts = pub as unknown as Record<string, unknown>;
        for (const agent of regulatoryAgents) {
          if (evaluateAgent(agent, facts)) {
            const actionResults = await dispatchActions(agent, facts);
            for (const ar of actionResults) {
              await logAgentAction({
                agent_id: agent.id,
                agent_name: agent.name,
                action_type: ar.action_type,
                target: ar.action_type === 'slack' ? '#channel' : ar.action_type,
                timestamp: ar.timestamp,
                detail: `${ar.success ? 'Sent' : 'Failed'}: ${String(facts.title ?? 'publication')}`,
              });
            }
            await updateAgent(agent.id, { last_triggered: new Date().toISOString() });
          }
        }
      }

      return {
        generated_at: new Date().toISOString(),
        business_domains: businessDomains,
        publications_found: allPubs.length,
        publications: allPubs,
        synthesis,
      };
    },
  });
}
