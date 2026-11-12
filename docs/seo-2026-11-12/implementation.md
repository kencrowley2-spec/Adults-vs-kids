# SEO implementation - November 12, 2026

This repository is the existing source of truth. No replacement website was created.

## Website changes

- Correct Explore monthly/yearly recurring terms, membership start and cancellation language; distinguish current PDFs from planned features.
- Correct Book 3 availability in Explore, catalog metadata and Club summaries; retain approved prices and no Book 4 paperback purchase button.
- Permanently redirect /website to / with campaign query parameters retained; replace internal aliases. Keep the canonical homepage public for signed-in users, with existing Dashboard navigation and login behavior intact.
- Add /books/ultimate-coloring-challenge, /books/ultimate-family-showdown, /books/ultimate-make-it-and-play-it-showdown, /books/ultimate-young-adult-challenge.
- Use actual existing sample PDFs/images, unique descriptions, careful age guidance, format-specific buttons and Book structured data. No identifiers, reviews or publication dates invented. Amazon short URLs are the approved existing catalog destinations; current external listing content remains unverified.
- Add free /family-championship-scorecard instructions and /printables/family-championship-scorecard.pdf, with three-round scoring and optional four-team bracket.
- Improve parent-vs-kid, championship, game-night, indoor and printable guides. Existing at-home guide already contains 25 activities; retain it and its related Arcade links. Remove repetitive app FAQs from editorial pages; retain game-guide FAQs.
- Register new canonical pages in the shared SEO catalog/sitemap (32 URLs total), add factual Organization/founder copy and book-specific social-preview imagery. Preserve robots exclusions and index/follow on public guides.
- Add the Bing verification tag supplied for the observed kencrowley2@gmail.com account. Verification and sitemap submission must be confirmed separately after deployment.

## Measurement

- Reuse existing first-party visitor/session cookies, source preservation and authoritative signup/payment events.
- Fix Amazon outbound tracking for link.amazon and amzn.to, and add Club checkout-click instrumentation.
- Add private read-only growth report under authenticated admin-data section=growth, after the existing administrator check.
- Show source/channel/landing/campaign sessions, verified registrations, gameplay events, actual created live checkout sessions, live reconciled initial PDF/Club orders, initial USD revenue, cohort conversion rates and live Stripe subscription status when available.
- Exclude test/internal records and revoked/unmapped payment evidence from confirmed revenue. Mark unavailable Stripe/Search Console values as unavailable, not zero. Label older payment amounts as unclassified legacy records and remove forecast proceeds from the actual-sales panel.
- No RLS, authentication, Stripe checkout, payment amounts, fulfillment logic or gameplay logic was changed. No new database schema was required.
- New revenue panel excludes renewal receipts and Amazon purchases; it does not pretend to be a complete Stripe accounting ledger. A real excluded signup/email and isolated Stripe test-mode browser journey remain acceptance work, separate from passing local/transaction fixtures.

## Prepared growth assets

- video-tracking-links.csv: 24 distinct platform/video UTM landing links.
- social-description-drafts.md: channel and six video description additions; not published.
- outreach-drafts.md: five prospective organizations/publications and a resource pitch; recipients not fully verified; no messages sent.

## Verification

Production build, typecheck, npm test, analytics/payment tests, home-routing test, admin purchase access test, SEO-growth content/aggregation fixtures and 32-page built HTTP crawl. Database analytics.sql authority/privacy/replay fixture ran inside a rolled-back transaction. No charges or verification emails were sent by the tests.

PageSpeed API returned HTTP 429. Local preview was not reachable from the separate cloud browser. No field Core Web Vitals, common-viewport browser pass or paid-checkout browser success is claimed solely from build/HTML tests.

Google Search Console reached a signed-out account chooser; Google URL inspection, canonical selection, crawl dates, sitemap status and indexing requests require sign-in. Bing account identity was verified visually; postdeployment verification status is recorded in the final user report. KDP and social publishing require explicit approval. External Amazon fetches could not verify listing metadata or Book 4 availability.
