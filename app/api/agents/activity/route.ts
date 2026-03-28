import { NextResponse } from 'next/server';
import { getAgentActions } from '@/lib/agents/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/activity — returns recent agent actions (last 50).
 */
export async function GET() {
  const actions = await getAgentActions();
  return NextResponse.json(actions);
}
