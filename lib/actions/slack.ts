import { formatTemplate } from './templates';
import type { ActionResult } from './dispatcher';

/**
 * Sends a Slack message via incoming webhook.
 *
 * Args:
 *   config: Action config with channel and template keys.
 *   data: Data to format into the message.
 *
 * Returns:
 *   ActionResult indicating success or failure.
 */
export async function sendSlackMessage(
  config: Record<string, string>,
  data: Record<string, unknown>,
): Promise<ActionResult> {
  const response = await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: formatTemplate(config.template ?? '{title}', data),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'unknown');
    return { action_type: 'slack', success: false, error: `HTTP ${response.status}: ${body}`, timestamp: new Date().toISOString() };
  }

  return { action_type: 'slack', success: true, error: null, timestamp: new Date().toISOString() };
}
