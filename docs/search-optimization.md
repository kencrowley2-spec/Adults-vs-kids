# Search optimization release — November 4, 2026

## What changed

- Public HTML game guide at `/family-games`, generated from the same 14-game catalog used by the Arcade. Suggested ages are editorial guidance; account creation/login remains required to play.
- Eight original activity guides covering home games, free online games, game night, ages 4–8, parent-versus-kid competitions, car games, quality time, and interactive screen time.
- Paperback overview at `/paperback-books`, linking to the existing samples and purchase workflow. No checkout, pricing, roster, founder entitlement, subscription, or authentication rules changed.
- Exact requested homepage title, description and visible H1. Existing hero statement, logo, slideshow, quiz, and action buttons retained. The H1 is in an added family-play section below the existing homepage content.
- Canonical URLs, page-specific descriptions, Open Graph/Twitter metadata, and Organization/WebSite/WebPage/Article/BreadcrumbList/Book/VideoGame JSON-LD. `/website` canonicalizes to `/`. Structured data contains no invented reviews, ratings, ISBNs, or availability claims.
- Sitemap includes 21 public canonical URLs. No invented last-modified dates. Robots allows public crawling for Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, and other agents through the wildcard rule. Account pages, APIs, and private areas are excluded; private responses also carry noindex headers. Auth remains the actual access control.
- Unsupported screen-time percentages removed from `/explore`; replaced with a practical shared-play prompt. Future AI-host availability clarified on Digital Philosophy.
- Optimized WebP copies of five cover images. The four homepage covers total 659,124 bytes versus 6,875,204 bytes originally (about 90% less). Original assets retained. Public image dimensions added where missing and video preload reduced to metadata. Slideshow timing and controls preserved.
- Admin Analytics now reports organic-search visits, known AI referral visits, new free family profiles, and a source table. Uses existing session/referrer tracking and a server-only aggregate function. Referrer-less traffic remains unknown. Registration counts are separate from referral counts; they are not an attributed conversion rate.

## Authorization still required: Google Search Console

No authorized Search Console account/API is connected here. Search Console ownership, indexing reports, sitemap submission, and search impressions/clicks have not been verified.

1. Sign in at https://search.google.com/search-console using the Google account that should own the website.
2. Add or select the `adultsvskids.com` Domain property. If ownership is unverified, copy Google's exact TXT verification record into GoDaddy DNS, then select Verify. Preserve existing DNS records.
3. Alternatively use the `https://adultsvskids.com/` URL-prefix property and supply its exact HTML verification token as the Vercel production environment variable `GOOGLE_SITE_VERIFICATION`, then redeploy. Public pages already support this verification tag. Domain-property TXT verification is preferred when all domain variants should be covered.
4. Under Sitemaps, submit `https://adultsvskids.com/sitemap.xml`.
5. Inspect `/`, `/family-games`, `/paperback-books`, and each activity guide. Check live accessibility, the selected canonical, Pages indexing reasons, Manual Actions, and Security Issues. Request indexing for priority pages as appropriate. Review mobile Core Web Vitals and PageSpeed Insights; no field CWV improvement is claimed before sufficient real-user data exists.

## Authorization still required: Bing Webmaster Tools

No authorized Bing Webmaster Tools account/API is connected here. Ownership, indexing reports, and sitemap submission have not been verified.

1. Sign in at https://www.bing.com/webmasters using the intended owner account.
2. Import the verified Google Search Console property, or add `https://adultsvskids.com/` directly.
3. For HTML verification, set the exact supplied `msvalidate.01` token as Vercel production `BING_SITE_VERIFICATION`, redeploy, then select Verify. DNS verification is another option using Bing's exact provided record.
4. Submit `https://adultsvskids.com/sitemap.xml`, then use URL Inspection and Site Scan to review priority pages, crawl errors, and canonicals.

The robots sitemap declaration is discovery support; it is not proof that either service accepted a manual submission.

## Baseline and repeatable measurement

Snapshot taken November 4, 2026, before release:

| Measure | Observed value |
| --- | --- |
| First existing analytics event | November 2, 2026, 9:05 p.m. Indiana time |
| Recorded page views since tracking began | 62 |
| Recorded sessions / browsers | 27 / 15 |
| Existing family profiles | 2 |
| Recognized organic-search visits, last 30 days | 0 |
| Recognized AI referral visits, last 30 days | 0 |
| Google/Bing indexed-page counts, impressions and clicks | Unknown; console access required |

Site analytics excludes recognized bots and administrator activity. Sessions expire after 30 minutes idle. Deleted cookies, blocked scripts, and missing referrers affect counts. Existing family profiles are not necessarily newly verified email registrations; use Search Console and the account records for their respective measures.

An external search-result sample did not surface the current website for the eight topic queries below or a site-restricted lookup. This is a bounded search-tool observation, not a complete Google/Bing ranking audit or a test of every AI assistant. A site-restricted result included an old third-party domain-list reference; this does not establish a current security classification. Check current Search Console Security Issues before drawing conclusions about domain history.

Use the same prompts, language, location, and account/search mode for future comparisons. Record date, service/model, whether web search was enabled, brand mention, exact cited URL, and whether the recommendation accurately describes the free account requirement. Keep source retrieval separate from a recommendation.

| Baseline prompt/topic | Current website observed in retrieved sample? | Separate ChatGPT/Bing Copilot/Perplexity session tested? |
| --- | --- | --- |
| Fun games parents can play with their kids at home | No | No |
| Free online games for parents and kids | No | No |
| Family game night ideas | No | No |
| Fun activities for kids ages 4–8 | No | No |
| Parent versus kid competition games | No | No |
| Fun games to play with kids in the car | No | No |
| Ways to spend more quality time with your children | No | No |
| How to make family screen time more interactive | No | No |

Use `/admin#analytics` for 1-, 7-, and 30-day search/referral counts and family-profile growth. Review search impressions, non-brand clicks, indexed canonical pages, and free profiles over comparable periods. Do not interpret zero AI referrals as proof of zero AI mentions: many services omit referrers. No rankings, inclusion, or recommendations are guaranteed.

## Verification and limits

Run `npm run build`, `npm run typecheck`, `npm test`, `npm run test:arcade`, `node tests/seo-http.mjs`, plus existing home-routing, roster, founder-badge, analytics, administrator-access/purchase, and PDF payment/HTTP tests. The SEO HTTP check covers 21 public pages, canonical metadata, JSON-LD parseability, crawler privacy, current game count, internal anchors/assets, login screens, and anonymous access guards.

Registration/login and Stripe security flows are exercised through existing automated fixtures and safe anonymous HTTP requests. Real inbox delivery and a completed live Stripe purchase require a controlled user acceptance test; do not claim those were completed. Keep existing production switches and payment data intact.

Database addition: `search_metrics()` is SECURITY INVOKER with an empty search path, executable by service_role only. Existing tables and RLS remain unchanged. Security advisors confirmed no new public-access issue; the existing platform_events no-policy informational notice is intentional for server-only analytics. Existing leaked-password protection is disabled; see https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection for a separate account-security review.

Schema JSON parses and expected types are checked locally; Google Rich Results Test and Schema.org's hosted validator still require an external validation pass. Game and organization markup does not imply eligibility for a particular Google rich-result treatment.
