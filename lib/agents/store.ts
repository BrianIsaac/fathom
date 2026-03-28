import { Redis } from '@upstash/redis';
import type { Agent, CreateAgentInput, AgentAction } from './types';
import { isMockMode } from '../data';
import { generateFishSVG } from '../fish/sprites';

const AGENTS_KEY = 'fathom:agents';
const ACTIVITY_KEY = 'fathom:agent_activity';

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }
  return _redis;
}

const mockAgents: Map<string, Agent> = new Map();
const mockActivity: AgentAction[] = [];

/**
 * Lists all agents.
 */
export async function listAgents(): Promise<Agent[]> {
  if (isMockMode()) return Array.from(mockAgents.values());
  const data = await getRedis().hgetall<Record<string, Agent>>(AGENTS_KEY);
  if (!data) return [];
  return Object.values(data);
}

/**
 * Gets a single agent by ID.
 */
export async function getAgent(id: string): Promise<Agent | null> {
  if (isMockMode()) return mockAgents.get(id) ?? null;
  return getRedis().hget<Agent>(AGENTS_KEY, id);
}

/**
 * Creates a new agent with a generated fish sprite.
 */
export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const agent: Agent = {
    ...input,
    id,
    fish_sprite: generateFishSVG(input.module, id, input.fish_config),
    created_at: new Date().toISOString(),
    last_triggered: null,
  };

  if (isMockMode()) {
    mockAgents.set(agent.id, agent);
    return agent;
  }

  await getRedis().hset(AGENTS_KEY, { [agent.id]: agent });
  return agent;
}

/**
 * Updates an existing agent.
 */
export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
  const existing = await getAgent(id);
  if (!existing) return null;

  const updated: Agent = { ...existing, ...updates, id };

  if (isMockMode()) {
    mockAgents.set(id, updated);
    return updated;
  }

  await getRedis().hset(AGENTS_KEY, { [id]: updated });
  return updated;
}

/**
 * Deletes an agent by ID.
 */
export async function deleteAgent(id: string): Promise<boolean> {
  if (isMockMode()) return mockAgents.delete(id);
  const existed = await getAgent(id);
  if (!existed) return false;
  await getRedis().hdel(AGENTS_KEY, id);
  return true;
}

/**
 * Logs an action dispatched by an agent.
 */
export async function logAgentAction(action: AgentAction): Promise<void> {
  if (isMockMode()) {
    mockActivity.unshift(action);
    if (mockActivity.length > 50) mockActivity.length = 50;
    return;
  }
  await getRedis().lpush(ACTIVITY_KEY, action);
  await getRedis().ltrim(ACTIVITY_KEY, 0, 49);
}

/**
 * Gets recent agent actions (last 50).
 */
export async function getAgentActions(): Promise<AgentAction[]> {
  if (isMockMode()) return mockActivity;
  const data = await getRedis().lrange<AgentAction>(ACTIVITY_KEY, 0, 49);
  return data ?? [];
}
