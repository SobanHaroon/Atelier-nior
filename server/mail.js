import { db } from './database.js';
import { HttpError } from './http.js';
export async function deliverMessage(message) {
  if (message.delivered_at) return;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `atelier-contact-${message.id}` },
    body: JSON.stringify({ from: process.env.CONTACT_FROM, to: [process.env.CONTACT_TO], reply_to: message.email, subject: `Atelier Noir / ${message.topic}`, text: `From: ${message.name}\nReply to: ${message.email}\nTopic: ${message.topic}\nReference: ${message.id}\n\n${message.message}` }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new HttpError(503, 'We could not deliver your message right now. Please retry; your message will not be duplicated.');
  await db(`store_messages?id=eq.${message.id}`, { method: 'PATCH', data: { delivered_at: new Date().toISOString() } });
}
