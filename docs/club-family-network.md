# Club family network

The private club app links to `/admin/app/network` from its home dashboard. The account identified by `families.user_id` is that family's administrator. Roster names are players, not independently authenticated administrators. No existing website profile permissions are changed.

## Current implementation

- Persistent, opt-in club profile with a family alias and a random 128-bit invite code.
- Family and friend's-family connection requests. Sending a request records the sending administrator's consent; only the receiving administrator can accept it.
- Approved circle, incoming/outgoing requests, blocking and removal. Blocking or removal cancels open invitations. Unblocking requires a fresh connection request, with a 24-hour retry delay.
- Challenge invitations for three club practice games. Only approved connections may exchange them; only the recipient can accept or decline. Invitations are in-app only.
- Each side sees only the other family's club alias and relationship/invitation status. No email, invite code, child roster, or location directory is shared.
- Database event log and mutation rate limit (60 successful actions per account per hour). Pair locks prevent reciprocal-request races; connection locks serialize challenge acceptance and blocking.

The `club_private` schema is not exposed through the Data API. Tables have RLS enabled and no direct grants or row policies for client roles, intentionally denying direct reads/writes. A public SECURITY INVOKER RPC delegates to a private SECURITY DEFINER action function with an empty search path, explicit identity checks, and narrowly scoped actions. The actor is always `auth.uid()`; client-supplied roles and owner IDs have no authority.

## Pre-release access

Both the app page/API and the database restrict access during development. The database's `club_private.preview_administrators` allowlist contains only the existing verified website administrator. Production test fixtures use a rolled-back transaction; there are no fabricated friends, requests, or scores in customer records.

## Before release

Online cross-device matches are not implemented by invitation acceptance. `onlinePlayReady` is explicitly false. Keep that disclosure until server-authoritative match sessions, authorized players, game state, result verification, disconnection/rejoin, and invitation expiry are implemented.

To open the network to paying families, replace the preview gate with verified membership and family-role checks in the API and database together. Do not simply remove the API administrator gate. Add any separately authenticated family members with server-managed membership records; children must never receive the family-admin role through user-editable metadata. Preserve bilateral administrator approvals for relationships, and enforce child-player eligibility at match entry. Add expiry and scheduled tournaments once real match sessions exist.

Tests: `node --experimental-strip-types tests/club-app.mjs`, `node --experimental-strip-types tests/club-network.mjs`, and `tests/club-network-access.sql` against Supabase inside its rollback transaction.
