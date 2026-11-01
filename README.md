# Adults vs. Kids

The production website source lives in **kencrowley2-spec/Adults-vs-kids**. This migration preserves the existing homepage, books, samples, graphics, and game tools from Sites source commit `511bfb8fa1d990ec054f875883ddf44ff6533c9f`.

## Stack

- Next.js 16 / Node.js 24, hosted on Vercel.
- Supabase project `ivrounrajalbemgdydfc` for Auth and PostgreSQL.
- Vercel project `prj_xIz1aYDNDomvM2TdggNMipixKXbC`, team `team_36D9eLbnV8fz8SQadf7TXbhE`.
- Primary domain: adultsvskids.com; www redirects to the primary domain.

## Development

Install with `npm ci`, then run `npm run dev`. Check with `npm run build`, `npm run typecheck`, and `npm test`.

Set server environment variables SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ADMIN_EMAIL, AUTH_EMAIL_READY, and AUTH_REGISTRATION_OPEN. Never commit environment files or privileged Supabase keys. Production values live in Vercel. Customer access uses a publishable key and each family's verified session; row-level security restricts private data to its owner. The founder has read access through a verified founder account.

Database migration: `supabase/migrations/20261101_website.sql`. Existing ChatGPT Sites/D1 data is not erased or automatically imported. The old Site remains available during the transition.

## Account activation

Registration and email sending remain disabled until a verified production email sender is configured in Supabase Auth. Set the Auth Site URL to the production origin and allow `/auth/confirm` there. Keep email confirmation enabled. Confirmation and password recovery links must reach the existing `/auth/confirm` handler. Enable AUTH_EMAIL_READY and AUTH_REGISTRATION_OPEN only after a real confirmation and recovery email test succeeds. No account or administrator password has been created by this migration.

Checkout remains closed; payment processing is a separate integration. No existing customer records were fabricated.

## Hosting activation

Vercel's GitHub App must be installed for this repository, then connected in the project's Git settings with `main` as the production branch. A successful commit must trigger a successful deployment before continuous deployment is considered verified. Until then, a source-file deployment can publish the same GitHub commit without an automatic Git connection.

The domain uses GoDaddy nameservers. Vercel's domain configuration is authoritative for the required DNS values. Change only website A/CNAME records; preserve mail and verification records. Verify both HTTPS domains after propagation.
