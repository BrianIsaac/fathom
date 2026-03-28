import https from 'https';
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
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { action_type: 'telegram', success: false, error: 'TELEGRAM_BOT_TOKEN not set', timestamp: new Date().toISOString() };
  }

  const body = JSON.stringify({
    chat_id: config.chat_id,
    text: formatTemplate(config.template ?? '{title}', data),
  });

  const MAX_RETRIES = 3;
  let lastError = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await sendOnce(token, body);
    if (result.success) return result;
    lastError = result.error ?? 'Unknown error';
    if (attempt < MAX_RETRIES - 1) {
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  return { action_type: 'telegram', success: false, error: lastError, timestamp: new Date().toISOString() };
}

function sendOnce(token: string, body: string): Promise<ActionResult> {
  return new Promise((resolve) => {
    const req = https.request(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.ok) {
              resolve({ action_type: 'telegram', success: true, error: null, timestamp: new Date().toISOString() });
            } else {
              resolve({ action_type: 'telegram', success: false, error: parsed.description ?? 'Telegram API error', timestamp: new Date().toISOString() });
            }
          } catch {
            resolve({ action_type: 'telegram', success: false, error: 'Failed to parse response', timestamp: new Date().toISOString() });
          }
        });
      },
    );
    req.on('error', (err) => {
      resolve({ action_type: 'telegram', success: false, error: err.message, timestamp: new Date().toISOString() });
    });
    req.write(body);
    req.end();
  });
}
