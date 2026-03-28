import { EARNINGS_SOURCES } from '@/lib/tinyfish/sources/earnings';
import { executeParallel } from '@/lib/tinyfish/client';
import { synthesiseEarnings } from '@/lib/openai/synthesise';
import { isMockMode, fetchOrMock } from '@/lib/data';
import type { ParallelSource } from '@/lib/tinyfish/types';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * POST /api/earnings/run -- runs earnings intelligence for a list of tickers.
 * Fires parallel TinyFish extractions per ticker, then GPT synthesis.
 * Streams progress via SSE.
 */
export async function POST(req: Request) {
  const { tickers } = await req.json();
  const tickerList = (tickers as string).split(',').map(t => t.trim().toUpperCase());

  if (isMockMode()) {
    const mockData = await fetchOrMock('earnings', async () => ({}));
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const mockTickers = ['AAPL', 'MSFT', 'GOOGL', 'GRAB', 'SE'];

    (async () => {
      const send = async (event: Record<string, unknown>) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      await send({ type: 'STARTED', mock: true, tickers: mockTickers });

      for (const ticker of mockTickers) {
        await send({ type: 'TICKER_STARTED', ticker });
        await new Promise(r => setTimeout(r, 300));
        await send({ type: 'TICKER_COMPLETE', ticker, status: 'success' });
      }

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      emit({ type: 'STARTED', tickers: tickerList });
      const startTime = Date.now();

      const results = await Promise.allSettled(
        tickerList.map(async (ticker) => {
          emit({ type: 'TICKER_STARTED', ticker });

          const sources: ParallelSource[] = EARNINGS_SOURCES
            .reduce<ParallelSource[]>((acc, s) => {
              const url = s.buildUrl(ticker);
              if (!url) return acc;
              acc.push({
                id: `${ticker}-${s.id}`,
                name: `${ticker} ${s.name}`,
                request: {
                  url,
                  goal: s.goal,
                  browser_profile: s.browserProfile,
                },
              });
              return acc;
            }, []);

          const sourceResults = await executeParallel(sources);
          const synthesis = await synthesiseEarnings(ticker, sourceResults);

          emit({ type: 'TICKER_COMPLETE', ticker, result: synthesis });
          return synthesis;
        })
      );

      const earnings = results
        .filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled')
        .map(r => r.value);

      emit({
        type: 'COMPLETE',
        status: 'success',
        result: {
          generated_at: new Date().toISOString(),
          tickers_queried: tickerList.length,
          tickers_returned: earnings.length,
          total_latency_ms: Date.now() - startTime,
          earnings,
        },
      });

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
