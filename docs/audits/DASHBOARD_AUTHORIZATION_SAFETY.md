# Dashboard authorization safety

## Practical outcome

Suspending a user or archiving its brand now stops an existing dashboard session on the next HTTP request. New WebSocket connections are rejected, and established sockets are closed when access-affecting user or brand changes are made through the dashboard.

Notification read updates and conversation assignments no longer trust a resource ID by itself. The database write also requires the authenticated brand, and an assignee must be active and belong to the conversation brand.

## Request model

- The shared `requireAuth` middleware supports both the legacy session user ID and the disabled-by-default OAuth path.
- One joined query loads the current user and assigned brand status, avoiding an extra brand lookup on every authenticated request.
- Suspended or pending accounts and clients of missing or archived brands receive a terminal `403` response and their current session is destroyed.
- Administrators remain able to manage archived brands, but an inactive administrator account is still rejected.

## Mutation boundaries

- `PATCH /api/notifications/:id/read` requires a brand ID and updates only when both notification ID and brand ID match.
- A client cannot select another brand in the request body; inaccessible notifications are returned as missing.
- `POST /api/conversations/:id/assign` hides foreign conversations and foreign, missing, or suspended assignees.
- The final conversation update requires conversation ID and brand ID and repeats the active same-brand assignee check inside the SQL statement, so a stale authorization read cannot redirect the write to another tenant.

## Realtime revocation

- WebSocket authentication applies the same active-user and active-brand decision used by HTTP.
- Suspending, reassigning, demoting, or deleting a user closes that user's established sockets with close code `4003`.
- Archiving a brand closes established non-admin sockets for that brand.
- The browser treats both `4001` (authentication required) and `4003` (access changed or revoked) as terminal, does not enter a reconnect loop, and reloads authorization. Revoked sessions reach login; active users whose brand or role changed resume with fresh permissions.
- Reconnecting with a stale suspended or archived session is rejected with close code `4003`, including when access changed while the socket was already offline.

## Verification boundary

Unit tests cover access decisions, assignment eligibility, and the terminal WebSocket reconnect policy. HTTP integration tests use two brands and prove blocked mutations perform zero writes. WebSocket integration tests cover connection rejection and established-socket revocation. Browser E2E verifies both HTTP and realtime login redirects on desktop and mobile, plus the complete desktop notification interaction with console and failed-response guards.

No test uses production sessions, provider credentials, real accounts, or outbound messaging.

This change requires no database migration.
