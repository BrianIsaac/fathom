import { NextResponse } from 'next/server';
import { CreateAgentSchema } from '@/lib/agents/types';
import { listAgents, createAgent, updateAgent, deleteAgent } from '@/lib/agents/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const agents = await listAgents();
  return NextResponse.json(agents);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = CreateAgentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const agent = await createAgent(parsed.data);
  return NextResponse.json(agent, { status: 201 });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing agent id' }, { status: 400 });
  }

  const updated = await updateAgent(id, updates);
  if (!updated) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing agent id' }, { status: 400 });
  }

  const deleted = await deleteAgent(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
