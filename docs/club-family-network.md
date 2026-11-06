# Club family network

The private club home dashboard links to `/admin/app/network`. The account identified by `families.user_id` is that family's administrator; player roster names do not grant administrator permissions. Existing website records and access rules are unchanged.

## Simple user flow

1. Choose a unique, searchable club family name.
2. Search another family's name and tap **Add friend**.
3. The receiving family administrator accepts the request.
4. Approved friends can exchange challenge invitations.

A family administrator can also create a named **Neighborhood** and invite families from search results. The owner manages group invitations and removals; each invited family administrator must accept before joining. Joining a Neighborhood does not automatically create friend relationships. Members can leave; the owner can close the group. Groups are private to accepted members and invited administrators. Pending invitations do not reveal the group's member list. No street address is collected.

## Implementation

`club_private` stores family aliases, relationships, challenge invitations, Neighborhoods, memberships and an audit log. Tables have RLS enabled with no direct client-role grants or policies, intentionally denying direct access. The public SECURITY INVOKER RPC delegates to a private SECURITY DEFINER function with an empty search path. Every request verifies `auth.uid()`, the family-owner account and the pre-release allowlist. Client-supplied roles and actor IDs have no authority.

Search returns at most 20 club aliases and IDs, excludes the current family and blocked connections, and never returns emails, child rosters or legacy invite codes. Club names are unique ignoring case and surrounding whitespace. Existing legacy codes remain internal for compatibility, are omitted from all responses, and their old direct helper is no longer callable by authenticated users. Public code-based requests and rotation are disabled.

Sending a friend request records the sender's approval; only the recipient administrator can accept. Blocking/removal cancels open challenge invitations. Blocking also cancels pending Neighborhood invitations between the families. Unblocking does not automatically restore friendships. Limits: 5 owned active Neighborhoods, 50 invited/accepted families per Neighborhood, 60 successful network/search actions per account per hour, and a 24-hour cooldown before re-inviting declined/removed families. Pair, connection and group locks serialize state changes.

## Pre-release status

The page, API and database remain administrator-only. The database preview allowlist contains the existing verified website administrator. Test families, requests and groups are created only inside a rolled-back transaction.

Online cross-device gameplay is not activated by invitation acceptance. `onlinePlayReady` remains false, with an explicit UI disclosure. Before release, replace preview gates with verified club membership and server-managed family-role checks together. Implement authorized match sessions, authoritative game state and results, disconnection/rejoin, invitation expiry and tournament services. Do not grant administrator authority through editable user metadata.

Validation: production build, account/public-page tests, `tests/club-app.mjs`, `tests/club-network.mjs`, and the rolled-back database tests in `tests/club-network-access.sql`.

## Buddies lobby and challenge introduction

`/admin/app/lobby` is linked from club Home, Family & Friends and the persistent Buddies tab. It lists only approved connections. Family accounts can exchange private messages (500 characters), lobby pings (30-second cooldown), and Friend vs Friend or Family vs Family invitations. The lobby refreshes while visible every ten seconds; pings are in-app notifications rather than device push notifications. Recent messages are bounded to 200 per account response. Removing or blocking a connection denies chat access and cancels its open challenges. Existing action limits and administrator approval rules apply.

Friend challenges store the sender’s chosen player alias; only the recipient administrator supplies Player 2’s name when accepting. Family challenges display club family names. Pending invitations expire after 24 hours and cannot be accepted afterward. An expired pending invitation is cancelled when a new one is sent on the same connection. Accepting an invitation does not launch cross-device gameplay; the lobby discloses this and offers a matchup preview for accepted invitations.

Local club practice asks for both names before starting. A shared three-second full-screen intro animates yellow and black panels from opposite sides, joins them with a white lightning divider and VS badge, and labels Player 1 / Player 2 with their names. Escape or Skip continues; reduced-motion preferences remove animations. Club Arcade links carry `source=club`, enabling the same intro with the selected roster names before single-game and series launches. Gameplay starts after the intro resolves. Website Arcade entry behavior is preserved.

Validation also includes `tests/club-lobby.mjs` (safe text rendering, messaging, pings, invitation modes, recipient names and intro skip) and rolled-back SQL coverage for message isolation, blocking, limits, and named friend challenges. Private tables deliberately have RLS with no client policies or direct table grants; only the checked function contract is exposed. No ordinary family account gains preview access.
