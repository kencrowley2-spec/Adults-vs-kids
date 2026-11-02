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

## Production account setup (2026-11-01)

The public domain serves the existing Vercel project. Supabase Auth Site URL is `https://adultsvskids.com`. The redirect allowlist includes these exact URLs:

- `https://adultsvskids.com/auth/confirm?next=/family`
- `https://adultsvskids.com/auth/confirm?next=/reset-password`

Email confirmation remains required. Resend SMTP is connected through its native Supabase integration, with sender `Adults vs. Kids <noreply@adultsvskids.com>`. Its domain is verified. Required mail DNS names are `resend._domainkey` (TXT), `rsend` (CNAME to `rsend.forge.rmta.net`), and `send` (CNAME to `send.forge.rmta.net`). Do not change the website A/www records for email setup.

Branded signup, recovery, and invitation templates are saved in Supabase Auth. Their links use `/auth/confirm?token_hash={{ .TokenHash }}&type=...&next=...`; signup uses type `signup` and next `/family`, recovery uses type `recovery` and next `/reset-password`, invitation uses type `invite` and next `/reset-password`. No token or SMTP credential belongs in this repository.

Real production delivery was verified in Resend for the approved founder invitation and for a reset email submitted through the live website's forgot-password form. Both were delivered to the founder's Gmail address. Production `AUTH_EMAIL_READY` and `AUTH_REGISTRATION_OPEN` are enabled after these delivery checks. Preview/development readiness settings are independent.

The founder's account was explicitly invited with permission; the founder must choose their own password from the email link. A successful first signup verification, password submission, and signed-in personalized dashboard visit still require the account owner's participation. Do not claim those interactive steps passed based only on delivered mail. New registrations collect first name, family team name, email, matching passwords, and adult account-manager confirmation. The `/family` page verifies the Supabase user server-side and loads the family's private data through RLS.

Checkout and paid memberships remain closed pending payment implementation. Future changes must continue in this GitHub repository and the existing Vercel/Supabase projects.

## Validation performed during migration

The production build, TypeScript check, and administrator-access tests pass. Transactional database checks cover owner access, cross-family read/write denial, anonymous waitlist privacy, quiz interval enforcement, and followup creation; test users and transactional fixtures were rolled back. HTTP checks cover public routes, sign-in requirements, forged identity-header rejection, origin checks, invalid waitlist rejection, a real waitlist write to Supabase, and duplicate signup handling. The production invitation and recovery delivery checks described above passed; the account owner still needs to complete the first password and sign-in flow.

## Administrator workspace

`/admin/login` uses the same verified Supabase email/password account as family sign-in. The founder email is checked on the server for the page and every administrator API request. The entry link is at the lower right of the login and signup panels. No administrator password is embedded in source or stored separately.

`/admin` includes the family directory, founder inbox and challenge reviews, app waitlist, founding-family interest, sample-game library, announcements, activity totals, configuration status, and role information. Directories are paginated (25 rows) and CSV exports contain the current page; overview exports contain the seven UTC dates shown in the chart. Family totals count dashboard profiles, not all Auth users. Analytics count saved records and make no online-user or revenue estimates.

Founder-only review notes, announcement drafts, and append-only workspace events have their own RLS policies. Announcement inserts/updates and review changes create audit events in the same database transaction. Only the latest updated published announcement appears on verified member dashboards; drafts are private, and publishing sends no email. The founder can archive announcements. This portal does not grant new administrators, delete customer accounts, process payments, or claim live AI functionality.

Verification: `npm test`, `npm run build`, JavaScript syntax checks, and the transactional database assertions in `tests/admin-access.sql`. The SQL tests roll back all fixtures, including test announcements and their audit events.
