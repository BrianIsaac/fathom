import { runMinoAutomation } from './client';
import type { ParallelSource, ParallelResult } from './types';

export interface MultiplexerConfig {
  sources: ParallelSource[];
  synthesise: (results: ParallelResult[]) => Promise<unknown>;
}

/**
 * Creates an SSE Response that multiplexes parallel TinyFish executions.
 * Uses the TransformStream + detached async IIFE pattern from the tinyskills cookbook.
 *
 * Args:
 *   config: Sources to execute and synthesis function to apply.
 *
 * Returns:
 *   A Response object suitable for returning from a Next.js route handler.
 */
export function createMultiplexedResponse(config: MultiplexerConfig): Response {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (event: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  (async () => {
    try {
      await sendEvent({ type: 'STARTED', sources: config.sources.map(s => s.id) });

      const scrapePromises = config.sources.map(async (source): Promise<ParallelResult> => {
        const startTime = Date.now();
        await sendEvent({ type: 'SOURCE_START', source: source.id });

        try {
          const response = await runMinoAutomation(
            source.request,
            process.env.TINYFISH_API_KEY!,
            {
              onStep: async (msg) => {
                await sendEvent({ type: 'SOURCE_STEP', source: source.id, detail: msg });
              },
              onStreamingUrl: async (url) => {
                await sendEvent({ type: 'SOURCE_STREAMING', source: source.id, streamingUrl: url });
              },
            },
          );

          const result: ParallelResult = {
            source_id: source.id,
            source_name: source.name,
            status: response.success ? 'success' : (response.error?.includes('BLOCKED') ? 'blocked' : 'failed'),
            latency_ms: Date.now() - startTime,
            data: response.success ? response.result as Record<string, unknown> : null,
            error: response.error ?? null,
          };

          await sendEvent({ type: 'SOURCE_COMPLETE', source: source.id, status: result.status, latency_ms: result.latency_ms });
          return result;
        } catch (err) {
          const result: ParallelResult = {
            source_id: source.id,
            source_name: source.name,
            status: 'failed',
            latency_ms: Date.now() - startTime,
            data: null,
            error: err instanceof Error ? err.message : String(err),
          };
          await sendEvent({ type: 'SOURCE_COMPLETE', source: source.id, status: 'failed', latency_ms: result.latency_ms });
          return result;
        }
      });

      const results = await Promise.allSettled(scrapePromises);
      const resolvedResults = results.map((r, i) =>
        r.status === 'fulfilled' ? r.value : {
          source_id: config.sources[i].id,
          source_name: config.sources[i].name,
          status: 'failed' as const,
          latency_ms: 0,
          data: null,
          error: r.reason?.message ?? 'Unknown error',
        }
      );

      const successful = resolvedResults.filter(r => r.status === 'success');

      if (successful.length > 0) {
        await sendEvent({ type: 'SYNTHESISING' });
        const synthesis = await config.synthesise(resolvedResults);
        await sendEvent({ type: 'COMPLETE', status: 'success', result: synthesis, sources: resolvedResults });
      } else {
        await sendEvent({ type: 'COMPLETE', status: 'failed', error: 'All sources failed', sources: resolvedResults });
      }
    } catch (err) {
      await sendEvent({ type: 'COMPLETE', status: 'failed', error: err instanceof Error ? err.message : String(err) });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
