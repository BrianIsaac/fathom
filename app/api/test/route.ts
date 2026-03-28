import { NextResponse } from 'next/server';
import { isMockMode } from '@/lib/data';

export const dynamic = 'force-dynamic';

/**
 * Test route that verifies the SSE pipeline works end-to-end using mock data.
 * Simulates the multiplexer pattern with fake source events and a synthesis step.
 */
export async function GET() {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (event: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  (async () => {
    try {
      await sendEvent({
        type: 'STARTED',
        mock_mode: isMockMode(),
        sources: ['acra_csv', 'google_news', 'yahoo_finance'],
      });

      const mockSources = [
        { id: 'acra_csv', name: 'ACRA BizFile', latency: 50 },
        { id: 'google_news', name: 'Google News', latency: 200 },
        { id: 'yahoo_finance', name: 'Yahoo Finance', latency: 150 },
      ];

      for (const source of mockSources) {
        await sendEvent({ type: 'SOURCE_START', source: source.id });
        await new Promise(r => setTimeout(r, source.latency));
        await sendEvent({ type: 'SOURCE_STEP', source: source.id, detail: `Extracting from ${source.name}...` });
        await new Promise(r => setTimeout(r, source.latency));
        await sendEvent({
          type: 'SOURCE_COMPLETE',
          source: source.id,
          status: 'success',
          latency_ms: source.latency * 2,
        });
      }

      await sendEvent({ type: 'SYNTHESISING' });
      await new Promise(r => setTimeout(r, 100));

      await sendEvent({
        type: 'COMPLETE',
        status: 'success',
        result: {
          risk_score: 3,
          risk_level: 'LOW-MEDIUM',
          summary: 'Test pipeline working correctly. This is mock data.',
          sources_returned: 3,
        },
        sources: mockSources.map(s => ({
          source_id: s.id,
          source_name: s.name,
          status: 'success',
          latency_ms: s.latency * 2,
        })),
      });
    } catch (err) {
      await sendEvent({
        type: 'COMPLETE',
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
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

/**
 * Health check endpoint that returns system status.
 */
export async function POST() {
  return NextResponse.json({
    status: 'ok',
    mock_mode: isMockMode(),
    env_keys_present: {
      tinyfish: !!process.env.TINYFISH_API_KEY && process.env.TINYFISH_API_KEY !== 'tf-...',
      openai: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-...',
      redis: !!process.env.KV_REST_API_URL && process.env.KV_REST_API_URL !== '...',
      slack: !!process.env.SLACK_WEBHOOK_URL && !process.env.SLACK_WEBHOOK_URL.endsWith('...'),
    },
  });
}
