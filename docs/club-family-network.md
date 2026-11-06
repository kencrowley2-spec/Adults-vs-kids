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
