const value = (env, key) => String(env[key] || '').trim();
export function getConfig(env = process.env) {
  const origin = value(env, 'STORE_URL').replace(/\/$/, '');
  const shippingRaw = value(env, 'STORE_SHIPPING_CENTS');
  const shippingCents = /^\d+$/.test(shippingRaw) ? Number(shippingRaw) : null;
  const countries = value(env, 'STORE_COUNTRIES').split(',').map(c => c.trim().toUpperCase()).filter(c => /^[A-Z]{2}$/.test(c));
  const databaseReady = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
  const baseReady = /^https:\/\//.test(origin) || (env.NODE_ENV !== 'production' && /^http:\/\/(localhost|terminal\.local)(:\d+)?$/.test(origin));
  const policies = { shipping: value(env, 'STORE_SHIPPING_POLICY'), returns: value(env, 'STORE_RETURNS_POLICY'), terms: value(env, 'STORE_TERMS') };
  const identity = { name: value(env, 'STORE_LEGAL_NAME'), address: value(env, 'STORE_BUSINESS_ADDRESS'), email: value(env, 'STORE_CONTACT_EMAIL') };
  const rateReady = value(env, 'RATE_LIMIT_SALT').length >= 32;
  const checkoutReady = Boolean(baseReady && databaseReady && rateReady && env.STORE_LIVE === 'true' && env.STORE_CATALOG_APPROVED === 'true' && env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && countries.length && Number.isSafeInteger(shippingCents) && shippingCents <= 100000 && Object.values(policies).every(Boolean) && Object.values(identity).every(Boolean));
  const contactReady = Boolean(baseReady && databaseReady && rateReady && env.RESEND_API_KEY && env.CONTACT_FROM && env.CONTACT_TO);
  return { origin, countries, shippingCents, databaseReady, checkoutReady, contactReady, policies, identity, testMode: Boolean(env.STRIPE_SECRET_KEY?.startsWith('sk_test_')), shippingLabel: value(env, 'STORE_SHIPPING_LABEL') || 'Standard delivery' };
}
