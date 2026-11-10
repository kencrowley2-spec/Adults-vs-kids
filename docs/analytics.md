# Source-to-play measurement

Approved and implemented November 10, 2026. First-party only; no third-party tracker added.

## Definitions

An HttpOnly visitor cookie lasts one year. An activity session expires after 30 minutes idle; its original landing path, external referrer hostname and five sanitized UTM fields remain immutable. A new campaign within an active session does not restart it. The first session ID preserves first touch separately. Cookies, blocking and multiple devices limit identity reconciliation. No arbitrary URL query strings, full referrers, drawings or payment details enter campaign fields. Never place personal data in campaign tags.

Signup is recorded only after a verified account callback/login and a previously observed signup intent. An old account signing in is not a new signup. Cross-device verification uses its original signup session. Completion events deduplicate by match ID. A first saved game requires an owned validated Arcade result and no earlier result or timed history. Browser-reported guest completions have weaker evidence and do not masquerade as saved results. Mystery Face and HexGL do not currently create this saved-result authority; Draw depends on the existing result validator. Unsupported and kids-only results are not included in the first-saved-game funnel. This is a measurement coverage limit, not a gameplay change.

Checkout context is associated server-side with the authenticated owner. Purchase events require the existing Stripe validation and a paid order. Initial PDF/Club checkouts count, not renewals or clicks. The webhook retries if attribution fails. Replayed payment and game callbacks deduplicate; revoked/refunded order rows drop out of paid growth. Missing checkout attribution is explicitly Unattributed, not inferred Direct. Amazon button clicks remain outbound events; they do not establish a paperback sale.

## Exclusions and reports

Administrator accounts, trusted `app_metadata.analytics_internal=true` accounts, preview deployments, known bot user agents and server-tagged QA visits are excluded. User-editable metadata and request-body flags cannot authorize an exclusion. Internal status persists across that visitor's later sessions until its cookies are cleared; QA End clears only analytics cookies. Test rows remain available for reconciliation. Existing history is retained and cannot be reconstructed into campaign cohorts.

Admin > Analytics provides 1/7/30 Indiana-day event counts by original session source; separate verified-signup cohorts with later conversions; calendar-week totals over the last 30 days; and CSV export. Event counts in a time window are not a sequential conversion rate. First-touch is stored privately; the displayed source is the original source of the relevant session. Test controls require verified administrator access and same-origin POST.

## Verification

`npm test`, production build and `npm run test:analytics` cover account access, safe return destinations, privacy bounds, initial cookie request serialization, result ownership, valid Stripe signatures, tampered/stale/wrong-mode/unpaid notifications, recurring checkout consent/amounts, refund handling, and attribution retry.

`tests/analytics.sql` runs service-role assertions inside a rolled-back transaction: immutable attribution, 31-minute simulated expiry, first touch, guest and authoritative completion replay, signup intent vs verified signup, unpaid checkout vs paid-order fixture, purchase replay, refund exclusion, QA exclusion and privilege boundaries. These are database authority fixtures, not an actual Stripe test-mode purchase or real signup email.

Existing broad `test:arcade` fixtures are stale against the baseline controller (missing guest-gate mock; navigation fixture expects an older dashboard wrapper). Targeted guest-gate, result, game-case and account tests pass. Do not treat those baseline fixture failures as proof of a gameplay regression.

Remaining acceptance work: one real excluded signup/email-verification journey and Stripe TEST-MODE checkout with an isolated test configuration. No live QA charge is authorized or necessary. Do not claim this external payment journey passed based solely on local signed webhook and database fixtures.
