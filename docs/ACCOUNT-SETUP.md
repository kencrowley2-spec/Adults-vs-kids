# Customer accounts and website deployment

The source of truth is the GitHub repository `kencrowley2-spec/Adults-vs-kids`. The migrated app runs on Next.js, uses Supabase Auth for verified email/password sessions, and stores website records in Supabase PostgreSQL. It does not trust incoming ChatGPT identity headers. The prior Sites deployment and its Cloudflare D1 records remain untouched during cutover.

## Configured resources

- Supabase project: `ivrounrajalbemgdydfc`, us-east-2.
- Vercel project: `prj_xIz1aYDNDomvM2TdggNMipixKXbC`.
- Vercel team: `team_36D9eLbnV8fz8SQadf7TXbhE`.
- Domains attached and ownership verified: adultsvskids.com and www.adultsvskids.com.
- The www domain redirects to the apex domain.
- Vercel runtime configuration includes the Supabase URL, publishable key, founder email, and registration/email readiness flags. No privileged Supabase key is used by the app.

## Private data

All eight public-schema website tables have row-level security. Each authenticated family accesses its own records. The verified founder account can read administrative records. Anonymous visitors can submit waitlist entries but cannot retrieve waitlist addresses. The database enforces the quiz interval, message submission limit, and preservation of a started family clock. Existing Sites records are not automatically imported.

## Remaining account-owner actions

1. Install Vercel's GitHub App for this repository and connect it to the existing Vercel project. Confirm that a push to main triggers deployment.
2. Update the website DNS records in GoDaddy using the project's current Vercel domain recommendations. Preserve mail and unrelated verification records.
3. In Supabase Auth, set the production Site URL and `/auth/confirm` redirect allowlist. Keep email confirmation enabled. Configure and verify a production SMTP sender. Confirm real signup and recovery email delivery before enabling AUTH_EMAIL_READY and AUTH_REGISTRATION_OPEN in Vercel, then redeploy.
4. The founder creates and verifies the actual founder account using their own password. No customer account or password was fabricated by the migration.

Registration and email sending are disabled until step 3 is verified. Existing login and private route guards remain functional. Checkout and paid memberships remain closed pending payment implementation.

## Validation performed during migration

The production build, TypeScript check, and administrator-access tests pass. Transactional database checks cover owner access, cross-family read/write denial, anonymous waitlist privacy, quiz interval enforcement, and followup creation; test users and transactional fixtures were rolled back. HTTP checks cover public routes, sign-in requirements, forged identity-header rejection, origin checks, invalid waitlist rejection, a real waitlist write to Supabase, and duplicate signup handling. Real confirmation/recovery delivery requires the SMTP setup above.
