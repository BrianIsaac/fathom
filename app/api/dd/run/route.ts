import { DD_SOURCES } from '@/lib/tinyfish/sources/dd';
import { executeParallel } from '@/lib/tinyfish/client';
import { buildGoal } from '@/lib/tinyfish/goals';
import { synthesiseDD } from '@/lib/openai/synthesise';
import { isMockMode, fetchOrMock } from '@/lib/data';
import type { ParallelSource } from '@/lib/tinyfish/types';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * POST /api/dd/run -- runs due diligence for a company.
 * Fires parallel TinyFish extractions, then GPT synthesis.
 * Streams progress via SSE.
 */
export async function POST(req: Request) {
  const { company, jurisdiction, ticker } = await req.json();

  if (isMockMode()) {
    const mockData = await fetchOrMock('dd', async () => ({}));
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const mockSources = [
      { id: 'google_news', name: 'Google News', delay: 200 },
      { id: 'yahoo_finance', name: 'Yahoo Finance', delay: 250 },
      { id: 'sgx_announcements', name: 'SGX Announcements', delay: 350 },
      { id: 'elitigation', name: 'eLitigation', delay: 300 },
      { id: 'glassdoor', name: 'Glassdoor', delay: 400 },
    ];

    (async () => {
      const send = async (event: Record<string, unknown>) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      await send({ type: 'STARTED', mock: true, sources: mockSources.map(s => s.id) });

      for (const source of mockSources) {
        await send({ type: 'SOURCE_START', source: source.id });
        await new Promise(r => setTimeout(r, source.delay));
        await send({ type: 'SOURCE_STEP', source: source.id, detail: `Extracting from ${source.name}...` });
        await new Promise(r => setTimeout(r, source.delay));
        await send({ type: 'SOURCE_COMPLETE', source: source.id, status: 'success', latency_ms: source.delay * 2 });
      }

      await send({ type: 'SYNTHESISING' });
      await new Promise(r => setTimeout(r, 300));
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

  const sources = DD_SOURCES.filter(s => {
    if (s.id === 'sgx_announcements' && jurisdiction !== 'SG') return false;
    if (s.id === 'elitigation' && jurisdiction !== 'SG') return false;
    if (s.id === 'yahoo_finance' && !ticker) return false;
    return true;
  });

  const parallelSources: ParallelSource[] = sources.map(s => ({
    id: s.id,
    name: s.name,
    request: {
      url: s.buildUrl(company, ticker),
      goal: buildGoal(s.goal, { company }),
      browser_profile: s.browserProfile,
    },
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const startTime = Date.now();
      emit({ type: 'STARTED', sources: sources.map(s => s.id) });

      const results = await executeParallel(parallelSources, (sourceId, msg) => {
        emit({ type: 'SOURCE_STEP', source: sourceId, detail: msg });
      });

      for (const r of results) {
        emit({ type: 'SOURCE_COMPLETE', source: r.source_id, status: r.status, latency_ms: r.latency_ms });
      }

      emit({ type: 'SYNTHESISING' });
      const synthesis = await synthesiseDD(company, results);

      const finalResult = {
        company,
        jurisdiction,
        generated_at: new Date().toISOString(),
        sources_queried: sources.length,
        sources_returned: results.filter(r => r.status === 'success').length,
        sources_failed: results.filter(r => r.status !== 'success').length,
        extraction_latency_ms: Date.now() - startTime,
        sources: Object.fromEntries(results.map(r => [r.source_id, r])),
        synthesis,
      };

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
