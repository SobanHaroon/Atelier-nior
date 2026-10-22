import { endpoint, json, body, sameOrigin, HttpError, uuid, emailValid, hash } from '../server/http.js';
import { getConfig } from '../server/config.js';
import { rpc, limit } from '../server/database.js';
import { deliverMessage } from '../server/mail.js';
export default endpoint(['POST'], async (req, res) => {
  sameOrigin(req);
  if (!getConfig().contactReady) throw new HttpError(503, 'The contact inbox is not open yet. Please check back soon.');
  const input = await body(req);
  if (input.website) throw new HttpError(400, 'Please complete the contact form again.');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (!uuid(input.id) || name.length < 2 || name.length > 100 || !emailValid(email) || message.length < 10 || message.length > 4000 || !['Product & sizing', 'My order', 'Delivery & returns', 'Press & collaboration', 'Something else'].includes(input.topic) || input.consent !== true) throw new HttpError(400, 'Please check your name, email, topic and message, and accept the privacy notice.');
  await limit(req, 'contact', 5, 900);
  const fields = { name, email, message, topic: input.topic };
  const record = await rpc('save_store_message', { p_message: { ...fields, id: input.id, fingerprint: hash(JSON.stringify(fields)) } });
  await deliverMessage(record);
  json(res, 200, { sent: true, reference: record.id });
});
