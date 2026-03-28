import { NextResponse } from 'next/server';
import { listAgents } from '@/lib/agents/store';
import { seedIfEmpty } from '@/lib/agents/seed-data';

export const dynamic = 'force-dynamic';

/**
 * POST /api/agents/seed — seeds mock agents and activity for UAT testing.
 * Idempotent: skips if agents already exist.
 */
export async function POST() {
  const before = await listAgents();
  if (before.length > 0) {
    return NextResponse.json({ seeded: false, reason: 'Agents already exist', count: before.length });
  }

  const created = await seedIfEmpty();
  return NextResponse.json({
    seeded: true,
    agents: created.length,
    agent_names: created.map(a => a.name),
  });
}
