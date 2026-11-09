# SEO repair release — November 9, 2026

Production source: kencrowley2-spec/Adults-vs-kids. Vercel project prj_xIz1aYDNDomvM2TdggNMipixKXbC, team team_36D9eLbnV8fz8SQadf7TXbhE. Preserve Supabase, authentication, payment logic and customer records.

## Verified issues and changes

- Homepage: explicit family games, challenges and entertainment title, H1 and introductory copy; direct book, PDF, game, Club and activity-guide links. Hero design, clock and controls retained.
- Four additional original guides: rainy-day indoor activities, organizing family tournaments, DIY printable family games and troubleshooting game-night friction. Existing canonical URLs expanded into 25 home games and 15 parent-versus-child challenges; game-night guide adapted for ages 4–12. No invented keyword volume or ranking data.
- Club count generated from the catalog; obsolete statements that family sign-in is unavailable corrected. Fixed Amazon listing-date promises changed to a planned launch target; existing planned paperback figures explicitly marked unconfirmed. Digital prices and one-time prelaunch Club terms retained. Charlie remains Coming January 2027.
- Organization/WebSite aliases and Article main entity/image added. Downloads Product/Offer nodes reflect the PDF catalog, without fake reviews or unverified retailer availability. Existing Book/Breadcrumb markup preserved.
- Creator League missing H1 repaired, with the former heading style retained.
- Checkout/setup and standalone unfinished neighborhood preview excluded from crawler discovery; preview noindex header added. No authentication permissions changed.
- Homepage 2,056,384-byte neon PNG replaced with a 49,248-byte WebP copy; original retained. Responsive logo, book-cover and Club-poster variants added. Intrinsic dimensions, first-poster preload and inactive-video preload improved. Book-cover aspect distortion corrected within existing boxes.

## Baseline and limitations

Live sitemap contained 22 public URLs; revised sitemap has 26. All original public sitemap URLs returned HTTP 200. Canonicals already use HTTPS apex adultsvskids.com. www redirects to apex; HTTP www has the platform HTTPS hop first. /website intentionally remains a public homepage alias for signed-in families and canonicalizes to /. /founders already redirects permanently to /all-access-club.

Direct Google brand-plus-domain search surfaced homepage, Explore, About, Club and other pages, with stale snippets for older content. Search samples do not establish rankings for all users. Search Console is not signed in in this environment; current index counts, Google-selected canonicals, submission status, manual actions and query performance cannot be asserted. An HTML verification tag is present; it is not proof of current ownership or domain-property verification.

Google PageSpeed Insights report oo6174s82w, November 9 at 9:27 AM Indiana time: mobile performance 75, SEO 100, accessibility 100, best practices 96, LCP 15.4 s, CLS 0, TBT 0 ms. Desktop performance 86, SEO 100, LCP 2.6 s, CLS 0, TBT 0 ms. Field data: No Data; laboratory scores are not field Core Web Vitals. Direct API returned 429 quota exhaustion. Local Lighthouse could not launch Chromium because socket creation was denied; hosted PageSpeed worked.

No GA4 measurement ID or Google tag was found in the inspected source/public HTML. Existing first-party analytics remain active; GA4 account configuration needs authorized account access. Stripe prices are verified against source and public catalog readiness, not an independent authenticated Stripe dashboard audit. No live purchase was made.

## Validation

Production build, TypeScript, scoped ESLint, public-page tests, HTTP SEO crawl, payment/account routing tests, cabinet/pinball and analytics checks. Broad `test:arcade` has a pre-existing fixture failure: createCaseReader is missing from its VM context. Do not claim this whole suite passed; cabinet and pinball modules have separate passing tests. No game-controller source changed.

## Measurement plan

Use Search Console query/page/device/country exports for 7/30-day clicks, impressions, CTR, position and indexed canonicals. Keep brand and non-brand groups separate. Use the site's aggregate analytics for landing visits and paid-order records for completed purchases; checkout clicks are not purchases. Current tracking has less than 30 days of history, so complete prior-period comparison is not available.

Days 1–30: verify account/property access, inspect priority pages, submit the 26-URL sitemap, request eligible indexing, establish GA4 property and conversion definitions, recheck actual Amazon listings before purchase links. Record comparable lab tests and field-data availability.

Days 31–60: use actual query impressions to improve titles and introductions on pages with visibility but weak clicks; consolidate pages only when query overlap and content purpose support it. Test parent usability and refine activities from feedback. Review landing-to-account and purchase funnels.

Days 61–90: evaluate comparable 28-day non-brand clicks, indexed pages and engaged family visits; improve pages with demonstrated demand. Publish additional original, playtested activities selectively. Repeat technical crawl and check field CWV once enough traffic exists. No guaranteed ranks, indexing dates or traffic outcomes.
