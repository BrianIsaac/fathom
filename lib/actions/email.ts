import { Resend } from 'resend';
import { formatTemplate } from './templates';
import type { ActionResult } from './dispatcher';

/**
 * Sends an email via Resend.
 *
 * Args:
 *   config: Action config with to, subject, and template keys.
 *   data: Data to format into the email.
 *
 * Returns:
 *   ActionResult indicating success or failure.
 */
export async function sendEmail(
  config: Record<string, string>,
  data: Record<string, unknown>,
): Promise<ActionResult> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { error } = await resend.emails.send({
    from: 'Fathom <onboarding@resend.dev>',
    to: config.to,
    subject: formatTemplate(config.subject ?? 'Fathom Alert: {title}', data),
    html: formatTemplate(config.template ?? '<p>{title}</p><p>{summary}</p>', data),
  });

  if (error) {
    return { action_type: 'email', success: false, error: error.message, timestamp: new Date().toISOString() };
  }

  return { action_type: 'email', success: true, error: null, timestamp: new Date().toISOString() };
}
