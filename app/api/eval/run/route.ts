import { ALL_EVAL_TASKS } from '@/lib/eval/tasks';
import { runEvalSuite } from '@/lib/eval/runner';
import { isMockMode, fetchOrMock } from '@/lib/data';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * POST /api/eval/run — manually trigger an eval run.
 * Streams progress via SSE as each task completes.
 */
export async function POST() {
  if (isMockMode()) {
    const mockData = await fetchOrMock('eval', async () => ({}));
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const mockResults = (mockData as Record<string, unknown>).results as Array<Record<string, unknown>> ?? [];

    (async () => {
      const send = async (event: Record<string, unknown>) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      await send({ type: 'STARTED', mock: true, total_tasks: 12 });

      for (const task of mockResults) {
        await send({ type: 'TASK_STARTED', task_id: task.task_id });
        await new Promise(r => setTimeout(r, 200));
        await send({ type: 'TASK_COMPLETE', task_id: task.task_id, status: task.status });
      }

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      emit({ type: 'STARTED', total_tasks: ALL_EVAL_TASKS.length });

      const result = await runEvalSuite(ALL_EVAL_TASKS);

      emit({ type: 'COMPLETE', status: 'success', result });
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
