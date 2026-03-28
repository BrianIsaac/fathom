import type { Agent } from '../agents/types';
import { sendSlackMessage } from './slack';
import { sendEmail } from './email';
import { sendTelegram } from './telegram';

export interface ActionResult {
  action_type: string;
  success: boolean;
  error: string | null;
  timestamp: string;
}

/**
 * Posts data to a webhook URL.
 *
 * Args:
 *   config: Action config with url key.
 *   data: Data to POST as JSON.
 *
 * Returns:
 *   ActionResult indicating success or failure.
 */
async function postWebhook(
  config: Record<string, string>,
  data: Record<string, unknown>,
): Promise<ActionResult> {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'unknown');
    return { action_type: 'webhook', success: false, error: `HTTP ${response.status}: ${body}`, timestamp: new Date().toISOString() };
  }

  return { action_type: 'webhook', success: true, error: null, timestamp: new Date().toISOString() };
}

/**
 * Dispatches all actions defined in a rule, running them in parallel.
 *
 * Args:
 *   rule: The rule whose actions to dispatch.
 *   data: The data to pass to each action sender.
 *
 * Returns:
 *   Array of results, one per action.
 */
export async function dispatchActions(
  agent: Agent,
  data: Record<string, unknown>,
): Promise<ActionResult[]> {
  const results = await Promise.allSettled(
    agent.actions.map(async (action): Promise<ActionResult> => {
      switch (action.type) {
        case 'slack':
          return sendSlackMessage(action.config, data);
        case 'email':
          return sendEmail(action.config, data);
        case 'telegram':
          return sendTelegram(action.config, data);
        case 'webhook':
          return postWebhook(action.config, data);
        case 'sheet':
          // Google Sheets integration deferred — mock for demo
          return { action_type: 'sheet', success: true, error: null, timestamp: new Date().toISOString() };
        default:
          return { action_type: action.type, success: false, error: 'Unknown action type', timestamp: new Date().toISOString() };
      }
    })
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      action_type: agent.actions[i].type,
      success: false,
      error: r.reason?.message ?? 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  });
}
