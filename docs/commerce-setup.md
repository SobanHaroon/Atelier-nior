# Commerce setup and launch

This guide connects the implemented storefront to the merchant's real services. Keep online ordering closed until the catalog, stock, policies, payment account, and fulfilment process have been verified. Do not place credentials in source code or share them in a public issue.

## 1. Confirm the merchant and catalog

Review every record in `shared/catalog.js`: product name, price, image, material, sizing, SKU, and sale rights. The six existing records come from the design concept; they are not verified stock. The current payment adapter uses USD, card payments, one fixed shipping rate, and explicitly allowed destination countries.

Supply the merchant's legal name, business address, customer support email, delivery policy, returns policy, and terms of sale. Review the privacy page against actual operations, retention periods, service providers, and the markets served. The site does not invent these details.

The merchant needs an eligible, verified Stripe business account for this adapter. If the business cannot use Stripe, leave ordering closed and integrate its supported payment provider before launch. A test key is not a substitute for an approved live account.

## 2. Create the database

Use a Supabase project dedicated to this store. Apply the checked-in migration once using the Supabase SQL editor or your normal migration workflow:

`supabase/migrations/202610210001_store.sql`

It creates:

| Table | Purpose |
| --- | --- |
| `store_inventory` | Available-to-sell units by product and size |
| `store_orders` | Reserved carts, Stripe references, payment status, and fulfilment information |
| `store_messages` | Contact submissions and provider-accepted delivery timestamp |
| `store_rate_limits` | Short-lived hashed abuse-limit counters |

All four tables enable row-level security. Anonymous and ordinary authenticated clients have no direct access. Server API handlers use the Supabase service-role key. Do not expose that key through a browser environment variable, public file, log, or client-side request.

The migration also creates the restricted functions `reserve_store_order`, `attach_store_checkout`, `finish_store_order`, `take_store_rate_limit`, and `save_store_message`. They are used by the server and should remain unavailable to ordinary clients.

All 25 product-size variants begin at **zero stock**. Enter verified quantities in the private dashboard. `stock` means available-to-sell units: checkout reservations immediately subtract from it. Do not overwrite it with a physical warehouse count while reservations are active. Reconcile open reservations first.

For new catalog products or sizes, create matching inventory rows and keep the IDs and sizes identical. A missing inventory row cannot be purchased.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` for local development. For Vercel, enter values in the project's Environment Variables settings and select the intended environment. Redeploy afterward. Do not add `VITE_` to any secret.

| Variable | Required value |
| --- | --- |
| `STORE_URL` | Exact canonical HTTPS origin, without a trailing slash; local development may use `http://localhost:5173` |
| `STORE_LIVE` | Keep `false` while configuring; set `true` only in the intended environment when ready to enable checkout |
| `STORE_CATALOG_APPROVED` | `true` only after merchant review of the actual catalog |
| `STORE_LEGAL_NAME` | Merchant's real legal name |
| `STORE_BUSINESS_ADDRESS` | Merchant's business address |
| `STORE_CONTACT_EMAIL` | Working customer support address |
| `STORE_COUNTRIES` | Comma-separated two-letter destination codes supported by your fulfilment and payment setup |
| `STORE_SHIPPING_CENTS` | Explicit nonnegative integer USD cents; `0` means free shipping, blank disables checkout |
| `STORE_SHIPPING_LABEL` | Customer-facing shipping method name |
| `STORE_SHIPPING_POLICY` | Complete delivery policy, timing, destinations, and charges |
| `STORE_RETURNS_POLICY` | Returns/exchanges window, conditions, process, and return details |
| `STORE_TERMS` | Merchant-approved terms of sale |
| `SUPABASE_URL` | Store project's API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Private server service-role key |
| `STRIPE_SECRET_KEY` | Server test key for testing or live key for production |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the matching endpoint and payment mode |
| `RESEND_API_KEY` | Private Resend key with sending permission |
| `CONTACT_FROM` | Verified Resend sender identity |
| `CONTACT_TO` | Fixed merchant recipient inbox |
| `RATE_LIMIT_SALT` | Independent random secret, at least 32 characters |
| `RECONCILE_SECRET` | Independent random secret for the maintenance endpoint |

Generate each random secret separately with `openssl rand -hex 32` and store it privately. Never reuse a payment or database key for these values. Policy values can contain actual newlines. They are displayed as plain text, not HTML.

`GET /api/store` returns only public merchant configuration and inventory availability. Checkout stays closed when required settings are missing or inventory cannot be loaded. Contact availability is independent and requires its database and email configuration.

## 4. Connect Stripe

1. Begin in an isolated test environment with test credentials and test inventory.
2. Configure the account's business details and Stripe Tax settings for the intended sales. Checkout uses automatic tax and exclusive tax behavior; the final amount is shown before payment.
3. Add the endpoint `https://YOUR-STORE-DOMAIN/api/webhook` in Stripe's event destination settings.
4. Subscribe to `checkout.session.completed`, `checkout.session.expired`, and `checkout.session.async_payment_succeeded`.
5. Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET` for the same environment and mode.
6. Configure Stripe receipt emails as desired. This application shows a printable receipt but does not send a separate branded order-confirmation email.
7. Test the complete flow before switching production to live keys and the matching live webhook secret.

The API validates the cart and reserves stock before creating hosted checkout. The initial reservation lasts 35 minutes. Stripe collects full shipping and billing details; the application never collects card numbers. Successful webhook handling re-fetches the session and verifies its current status and totals. Redirecting to `/checkout/success` does not itself mark an order paid.

The private receipt token stays in the customer's session storage, not in a URL. A receipt must be opened in the browser session used for checkout. Stripe's email receipt provides an independent customer record.

## 5. Connect the contact inbox

Verify the sending domain in Resend, then configure `RESEND_API_KEY`, `CONTACT_FROM`, and `CONTACT_TO`. The form stores a validated submission first and sends plain text to the fixed recipient. User input cannot choose the destination. The customer's email is used as Reply-To.

The UI reports success only after the provider accepts the send and the record is marked delivered. This timestamp records provider acceptance, not proof of inbox delivery or reading. Check Resend delivery/bounce status when troubleshooting. A failed send leaves a durable record so it can be reviewed and retried. Repeated identical requests use an idempotency key; avoid manual duplicate sends.

## 6. Deploy all source files

Use the repository root with the Vite preset, Node 24.x, `npm ci`, `npm run build`, and `dist` output. Include `api/`, `server/`, and `shared/`; a static-only upload cannot run checkout.

The checked-in `vercel.json` preserves API routes, enables deep application links, and adds restrictive response headers. The site uses local fonts and images. Stripe is opened as a top-level redirect, not embedded in a frame.

The existing project is `atelier-noir-motion`, with production at `https://atelier-noir-motion.vercel.app`. Set `STORE_URL` to the final public origin. Update the sitemap when changing domains. The existing Vercel project is connected to this GitHub repository and deploys `main` automatically. Check the deployment commit and ready state after every production push.

## 7. Verify before enabling real orders

Run `npm run check`. Automated tests cover pricing, API guards, receipt ownership, contact routing, webhook signature validation, and the actual SQL migration's permissions and stock transitions. They use mocked providers and a local database engine; they do not verify your external accounts.

In a test environment:

- Browse the catalog and deep product links on desktop and mobile; check search, filters, wishlist, sizes, and bag persistence.
- Complete a test payment and verify exactly one paid order, correct tax/shipping, stock reduction, receipt ownership, and payment details in Stripe.
- Retry the same checkout and replay the webhook; confirm no duplicate reservation or paid order.
- Cancel checkout, return to the bag, and resume the existing session. Cancellation does not immediately release inventory; verified expiry does.
- Expire a test Stripe session and confirm its inventory is restored once. A paid order must never be restocked by a delayed expiry event.
- Test insufficient stock, an unavailable service, and a forged webhook; none should produce a paid confirmation.
- Send a contact test to the merchant's own inbox and verify both the database record and actual email arrival.
- Check the merchant identity, support channel, destinations, taxes, prices, delivery, returns, privacy, and terms shown to customers.

Then configure the production services and real quantities, set the two launch flags only after review, redeploy, and verify the intended production configuration. Test keys visibly label checkout as a test. Never run automated test cards against live mode.

## 8. Operate the store

### Orders and fulfilment

Use the private Supabase dashboard to inspect paid orders. `store_orders.customer` contains payment-provider customer and shipping details after verification. Use the stored Stripe session and payment references to investigate issues. Never fulfil a `reserved`, `checkout`, `expired`, or `failed` row as a paid order.

There is no custom admin dashboard or shipment automation. The merchant handles packing, tracking, customer support, and fulfilment records through its operational tools. Issue refunds in Stripe and reconcile stock deliberately; refund events do not automatically restock products or update a dedicated refund state in this application.

### Missed webhooks and reconciliation

`POST /api/reconcile` requires `Authorization: Bearer <RECONCILE_SECRET>`. Call it from a trusted maintenance system with the secret stored privately. It checks up to 100 pending rows, retrieves current Stripe sessions, and applies verified terminal states. It is not a public administration endpoint and is not scheduled automatically.

Review `requiresReview` rows that have no attached session. A network timeout can conceal a successfully created Stripe session, so **do not release stock based only on elapsed time**. Find the session in Stripe using the order reference or idempotency information, attach or reconcile the verified result, and release inventory only when you have established that payment cannot complete. Retain records for audit and investigate errors before retrying.

If more than 100 unresolved rows accumulate, investigate the oldest pending rows and extend maintenance pagination rather than assuming one call checked every order. Monitor failed Stripe deliveries and Vercel function errors. Application logs intentionally omit request bodies, provider responses, customer data, and secrets.

### Privacy and maintenance

Set appropriate retention periods and restrict dashboard access to authorized staff. Keep payment/transaction records as required for the merchant's obligations; remove stale contact records when no longer needed. Rate-limit counters older than two days are pruned during subsequent limiter calls. Rotate leaked keys, update server configuration, and redeploy. Never publish database exports containing customer information.

To pause sales, set `STORE_LIVE=false` and redeploy. Existing Stripe sessions may still complete: expire or reconcile them through Stripe as appropriate and keep the webhook available. Pausing new checkout is not the same as cancelling existing payments.

## Official references

- [Stripe Checkout sessions](https://docs.stripe.com/api/checkout/sessions/create)
- [Stripe webhook signatures](https://docs.stripe.com/webhooks/signature)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase database functions](https://supabase.com/docs/guides/database/functions)
- [Resend email API](https://resend.com/docs/api-reference/emails/send-email)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
