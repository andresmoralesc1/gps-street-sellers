/**
 * Brevo transactional email helper.
 *
 * Single function, no abstractions — when we need templates, retry, or queue,
 * add it here. ponytail: direct fetch instead of an SDK, one endpoint, no retry
 * layer; add `@getbrevo/brevo` SDK if we ever need batch/bulk/templates API.
 */

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  messageId: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');

  const fromEmail = process.env.EMAIL_FROM || 'notifications@gpsstreetsellers.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'BarrioTech';

  const to = Array.isArray(params.to) ? params.to : [params.to];

  const body: Record<string, unknown> = {
    sender: { name: fromName, email: fromEmail },
    to: to.map((email) => ({ email })),
    subject: params.subject,
    htmlContent: params.html,
  };
  if (params.text) body.textContent = params.text;
  if (params.replyTo) body.replyTo = { email: params.replyTo };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo send failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { messageId?: string };
  return { messageId: data.messageId ?? '' };
}