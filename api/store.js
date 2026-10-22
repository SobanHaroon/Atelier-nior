import { endpoint, json } from '../server/http.js';
import { getConfig } from '../server/config.js';
import { db } from '../server/database.js';
export default endpoint(['GET'], async (req, res) => {
  const config = getConfig();
  let inventory = null, checkoutReady = config.checkoutReady;
  if (checkoutReady) {
    try { const rows = await db('store_inventory?select=product_id,size,stock'); inventory = Object.fromEntries(rows.map(row => [`${row.product_id}:${row.size}`, row.stock])); }
    catch { checkoutReady = false; }
  }
  json(res, 200, { checkoutReady, contactReady: config.contactReady, testMode: config.testMode, inventory, countries: config.countries, shippingCents: config.shippingCents, shippingLabel: config.shippingLabel, policies: config.policies, identity: config.identity });
});
