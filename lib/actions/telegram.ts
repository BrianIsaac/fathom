import { formatTemplate } from './templates';
import type { ActionResult } from './dispatcher';

/**
 * Sends a Telegram message via the Bot API.
 *
 * Args:
 *   config: Action config with chat_id and template keys.
 *   data: Data to format into the message.
 *
 * Returns:
 *   ActionResult indicating success or failure.
 */
export async function sendTelegram(
  config: Record<string, string>,
  data: Record<string, unknown>,
): Promise<ActionResult> {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.chat_id,
      text: formatTemplate(config.template ?? '{title}', data),
      parse_mode: 'Markdown',
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'unknown');
    return { action_type: 'telegram', success: false, error: `HTTP ${response.status}: ${body}`, timestamp: new Date().toISOString() };
  }

  return { action_type: 'telegram', success: true, error: null, timestamp: new Date().toISOString() };
}
