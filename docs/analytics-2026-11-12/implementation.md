# Google Organic Growth measurement foundation

Status: prepared for review; no production deployment, account setting change, new property, Web stream, API grant, or new live tracking event has been performed.

## Verified account evidence (November 12, 2026, Indiana time)

- Signed-in Google Analytics opens account 415708536 / property 563555408. Home says "No data streams found." The visible property selector begins "hook up> https://sites.googl...". This does not independently establish an ADULTS vs. KIDS property.
- Google's first-use "My email communications" dialog blocks property selection. Four optional categories are checked. The owner expressly required authorization before account setting changes. No preferences were saved and no new property/stream was created.
- Search Console property https://adultsvskids.com/ remains accessible and Settings says "You are a verified owner." Property added November 4, 2026.
- Its Associations page reports no associated Google Analytics service, no pending requests, and "We couldn't find a Google Analytics property for kencrowley2@gmail.com" on the disabled Associate control.
- The current report still shows 77 impressions, 4 clicks, 5.2% CTR and 9.6 average position, with available chart dates November 3-10. This is historical baseline data, not a ranking gain caused by today's release.
- Read-only first-party database snapshot: attribution began November 10 at 15:39:11 UTC; 30 non-test sessions across all sources, 0 recognized Google-organic sessions, 0 verified Google-origin signups and 0 mapped Google-origin stored paid orders. Scope differs from the Search Console baseline. These are not GA4 measurements or a complete revenue reconciliation.

## Implemented in this branch

- New administrator-only `/admin#organic` section and `/auth/admin-data?section=google-organic&days=7|28|90`, behind the existing verified administrator authority. Authentication behavior is unchanged.
- Current/previous equal-length periods; all exclude today. GSC uses Pacific dates, GA4 the configured property zone, first-party data Indiana dates. Missing/capped/partial sources are labeled, not silently turned into zeros.
- Read-only Search Console API adapter: summary, date trends, disclosed top 20 queries, landing pages, ten exact priority keywords, current/previous movement, brand-like groups and unclassified impression remainder. Query/page totals are kept separate. Final Web data only; top-row caps and privacy suppression remain explicit.
- Read-only GA4 Data API adapter: sessions filtered to `sessionSource=google` and `sessionMedium=organic`, previous comparison, daily trend and landing pages. No GA4 purchase/registration totals are substituted for authoritative first-party business records.
- Private first-party reporting: verified signup timestamps and original signup sessions; Google-only acquisition cohorts; Amazon outbound clicks; independent session/browsers and landing counts.
- Optional, bounded read-only live Stripe receipt reconciliation for mapped initial PDF/Club orders. Confirms type, ownership, mode, settled payment, currency/amount and current nonrefunded/nondisputed charge. Rejects legacy one-time Club purchases as recurring membership; monthly/annual separated. No fulfillment or payment mutation is called. Report deduplicates by checkout ID and keeps sessions with both signup/purchase from being counted twice in conversion rates.
- Optional basic-consent GA4 browser collector, off by default. One configured page_view per load; no tag before consent; withdrawal disables collection and clears GA cookies. No names, emails, user IDs, query strings, fragment tokens, form data or gameplay are explicitly transmitted. Referrer is origin-only; accepted campaign values are bounded/sanitized. Amazon outbound is a separate event, never purchase.
- Collector only attaches to canonical public pages, and its server config denies signed-in users, internal QA sessions, automation and preview deployments. GPC/DNT suppress it. No Google collector on admin, accounts, games, checkout or member routes. This means GA4 coverage is deliberately consented public acquisition only, while business conversions remain private first-party reporting.
- Integrations are disabled until independently authorized/configured. A configured tag is not proof of actual receipt by GA4.

## Secure configuration after approval

Configure server environment variables in the existing Vercel project; never put keys in source or browser variables:

| Variable | Purpose / approval boundary |
| --- | --- |
| GA4_MEASUREMENT_ID | Verified Web stream G- ID; obtain only after matching account, property and adultsvskids.com stream |
| GA4_COLLECTION_ENABLED=true | Activates optional collection on production public pages; requires separate release/collection approval and privacy review |
| GA4_PROPERTY_ID | Verified numeric AVK property ID for read-only reports; do not use the currently selected unverified property by assumption |
| GA4_REPORTING_TIMEZONE | Match actual GA4 property zone; recommended Indiana if owner chooses it during setup |
| GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON | Server-only service account JSON, installed through secret configuration, not pasted into chat |
| GOOGLE_REPORTING_ENABLED=true | Activates read-only Google reports after API and resource access is granted |
| ORGANIC_STRIPE_RECONCILIATION=true | Activates existing-key read-only live receipt checks; does not create, charge, refund or alter a subscription |

The reporting identity needs Google Analytics Data API and Search Console API enabled in its Google Cloud project; GA4 Viewer on the specific verified property; Search Console Restricted-user access to the exact https://adultsvskids.com/ property for performance reads. OAuth scopes are analytics.readonly and webmasters.readonly. It does not need Google Ads, Gmail, billing, property Editor, or owner permissions for reporting. No identity or grant was created. Administrative property/stream creation and Search Console linking require the owner's appropriate Editor/owner authority and explicit authorization.

The GA4/Search Console UI association is separate from server API credentials: linking the products will not automatically authorize this dashboard to query either API.

## Directly verified vs pending

Passed: production build/type checks; public pages; existing analytics/payment/account access fixtures; Google adapter contracts; consent simulations; duplicate and private admin fixtures; 32-page built HTTP crawl. No real signup, payment, customer email or synthetic production tracking write was performed.

Pending: confirmed AVK GA4 account/property; actual stream/measurement ID; live GA4 DebugView or Realtime receipt; GA4/Search Console association; service account/API grants; active read-only Google report calls; mobile/desktop browser acceptance and performance measurements after activation; complete gift-basket attribution and renewal/refund/cancellation ledger.

No live event or operational Analytics claim is made from mocked Google responses, a successful build, a tag request, or an HTTP 204.

## Explicit coverage limits

- Gift basket checkout is anonymous and currently has no durable analytics session mapping. A paid-success browser message does not establish organic acquisition. Metrics remain Not Yet Available; a separately reviewed server-side mapping/receipt integration is needed, without changing price or checkout UX.
- Renewal/cancellation/refund event history has no complete reporting ledger. Initial paid memberships are not currently active subscription totals. Refunded/disputed initial receipts are excluded when reconciliation is available; no complete refund total is claimed.
- GA4 receives only public page_view / paperback_outbound events under this design. Authoritative signup and purchase reporting remains first-party; no Google Measurement Protocol purchase sender or cross-device user linkage is implemented.
- No automated recurring ranking check or notification was scheduled. Dashboard period refreshes query existing Google history when connected; a weekly scheduled review needs working credentials and an explicit schedule.

## Activation / acceptance sequence

1. Owner authorizes resolving the Google email-preference dialog. Identify the intended AVK account/property across existing properties before creating anything.
2. Reuse an existing adultsvskids.com Web stream; create one only if absent and owner authorized. Confirm measurement ID, time zone and enhanced-measurement choices. Disable automatic form/outbound/search measurement if the new limited collector is used; keep advertising and Google signals off.
3. Review the public privacy notice and audience/consent design before activating Google collection. The adult wording is not verified adult age or parental-consent proof. Children can reach public pages; no legal-compliance claim is made. Review current Google policies and applicable child/audience/privacy obligations with the owner.
4. Authorize the Google account association and narrowly scoped reporting identity. Store credentials securely and check live report calls.
5. Approve the new production integration release. Deploy only this reviewed change in the existing project; do not reapply the prior SEO PR.
6. Use an excluded/internal Google debug test configuration before normal collection; prove denied state sends no Google request, granted state receives exactly one page_view, and Amazon click is not purchase. Observe GA4 DebugView/Realtime directly. Do not mark active developer/internal filters permanently until their effect is understood and checked.
7. Verify mobile and desktop paths; reconcile authoritative test-mode signup/payment fixtures in isolated environments. Keep test events/revenue outside business reporting. Await actual consenting Google-search arrivals for real organic-session attribution; do not manufacture them with utm_source=google.
8. Establish a complete gift-basket and subscription lifecycle ledger in a separately reviewed change; do not mark these metrics operational until it is reconciled.

## 30 / 60 / 90-day monitoring

- First 30 days (by Dec 12): confirm stream, actual event receipt and access; record collection start/consent coverage; review weekly 7-day observations; establish first full 28-day GSC/GA4/first-party windows. Verify signups and paid receipts against actual authority. Use raw counts for tiny samples.
- Days 31-60 (by Jan 11): compare equal complete 28-day windows; report exact keyword impressions/clicks/positions with sample sizes; flag pages averaging positions 4-20 only where actual queries support it. Report actual registrations/revenue with separate cohort denominators and uncertainty.
- Days 61-90 (by Feb 10): evaluate 90-day clusters, converting landing pages, consent gaps and real organic revenue. Recommend page improvements from observed data; no guaranteed ranking or invented market-volume claims.

Primary technical references: developers.google.com/analytics/devguides/reporting/data/v1/quickstart; developers.google.com/analytics/devguides/reporting/data/v1/api-schema; developers.google.com/webmaster-tools/v1/searchanalytics/query; developers.google.com/identity/protocols/oauth2/service-account; developers.google.com/tag-platform/security/guides/consent; developers.google.com/analytics/devguides/collection/ga4/views; support.google.com/analytics/answer/9019185; ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions.
