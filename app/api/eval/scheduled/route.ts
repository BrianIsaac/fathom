import { NextResponse } from 'next/server';
import { ALL_EVAL_TASKS } from '@/lib/eval/tasks';
import { runEvalSuite } from '@/lib/eval/runner';
import { isMockMode, fetchOrMock } from '@/lib/data';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * GET /api/eval/scheduled — cron-triggered eval run (daily at 6am).
 * Runs all tasks and returns JSON summary.
 */
export async function GET() {
  if (isMockMode()) {
    const mockData = await fetchOrMock('eval', async () => ({}));
    return NextResponse.json({ mock: true, ...mockData });
  }

  const result = await runEvalSuite(ALL_EVAL_TASKS);
  return NextResponse.json(result);
}
