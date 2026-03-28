import { NextResponse } from 'next/server';
import { getAgentActions, listAgents } from '@/lib/agents/store';
import { isMockMode } from '@/lib/data';
import { seedIfEmpty } from '@/lib/agents/seed-data';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/activity — returns recent agent actions (last 50).
 */
export async function GET() {
  if (isMockMode()) {
    const agents = await listAgents();
    if (agents.length === 0) await seedIfEmpty();
  }
  const actions = await getAgentActions();
  return NextResponse.json(actions);
}
