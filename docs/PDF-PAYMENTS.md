# PDF purchases

The PDF store is `/downloads`; the signed-in purchase library is `/family/downloads`.
Stripe holds the four $2.99 one-time products and a $9.95 four-book bundle. No app memberships are sold through these routes.

## Current activation gate

Production uses Stripe live prices, protected server credentials, a signed webhook, and four verified private PDFs. `PDF_CHECKOUT_OPEN` is the deployment activation switch; set it to `false` and redeploy to pause new sales. Do not use live credentials with sandbox price IDs or vice versa.

Server-only environment variables:

- `STRIPE_SECRET_KEY`: restricted key with Checkout Sessions write, Prices read, Payment Intents read, and Charges read. Include any dependent read permissions Stripe requires. No balance, payout, refund-write, or subscription permissions are needed.
- `STRIPE_WEBHOOK_SECRET`: signing secret for `/api/stripe/webhook`.
- `SUPABASE_SERVICE_ROLE_KEY`: used only in payment server routes to persist verified purchases and sign private PDF downloads. Never expose it in browser code.
- `STRIPE_MODE`: `live` in production; `test` in a sandbox deployment.
- `PDF_SITE_ORIGIN`: the canonical HTTPS origin used in Checkout return URLs.
- `STRIPE_PDF_BOOK_1_PRICE` through `STRIPE_PDF_BOOK_4_PRICE`, and `STRIPE_PDF_BUNDLE_PRICE`.
- `PDF_CHECKOUT_OPEN`: explicit final activation switch.

Configure the webhook for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, and `charge.dispute.created`. Signed events and the return-page confirmation both retrieve the Checkout Session from Stripe; fulfillment is idempotent by `session_id`. Payment status, exact total/currency, mode, product allowlist, line items, owner reference, and current refund/dispute state are checked before access is granted.

The private Supabase bucket is `paid-pdfs`. Upload the approved complete PDFs as `book-1.pdf` through `book-4.pdf`, verify bytes and page counts, then set only the corresponding `pdf_assets.ready` rows to true. Never place paid PDFs in `public/` or this public GitHub repository.

## Resolved source files

| Book | Pages | SHA-256 |
| --- | ---: | --- |
| Coloring | 64 | 5c9a8c201129df7a0b23510f591d0dbaec4b7c6af9258d6601a9397d26d436b3 |
| Family Showdown | 64 | 258d3af7fabc66d687fb9c0b7ed68b1cbe6aeaf5214b6137378e1e2e18e7a16e |
| Make-It-and-Play-It | 119 | bb00569d33ded7ff4a9bb25edee3374e8e498c3124fbcd71265626d23d773fb5 |
| Young Adult | 90 | e9bf87ab01837fe8aacd256fb8c2436207cb4b1e32188e8dd3e781a38df3d445 |

Source files have been located, page-count checked, and their covers visually checked. Private uploads were downloaded again and SHA-256 matched to these originals. All four asset readiness flags are enabled. No paid files have been committed to Git.

## Validation

Run `npm run build`, `npm run typecheck`, `npm test`, `node tests/pdf-payments.mjs`, and `node tests/pdf-http.mjs`. With the local production server running, `node tests/logout-origin.mjs` checks origin-safe sign-out.

Before opening sales, complete a Stripe sandbox purchase and verify the paid account can download the exact PDF, another account cannot, and an unpaid/cancelled checkout cannot unlock it. Replay the same signed event to verify no duplicate order, then refund the sandbox payment and verify access is revoked. Confirm webhooks succeed if the buyer never returns to the site. Do not use real customer charges for testing.

The optional `tests/pdf-integration.mjs` accepts a JSON object on stdin with `stripeKey` (test mode only), `supabaseUrl`, `publishableKey`, and `serverKey`. It creates disposable Auth users and Stripe test products, prints a hosted test Checkout URL for completion with Stripe test data, and removes the Auth fixtures and archives products afterward. Supply original PDFs in the adjacent `pdf-source` folder for byte comparisons. Do not commit credentials or source PDFs. Node behind an HTTP proxy may require `--use-env-proxy` and localhost in `NO_PROXY`.
