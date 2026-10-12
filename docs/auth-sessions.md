# Authentication and sessions (internal)

This page documents the login, session cookie, and API authorization flow as
implemented in the Next.js API routes. Use it when changing auth handlers,
adding protected endpoints, or troubleshooting unexpected 401/403 responses.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Session cookie names, slots, expiry, inactivity timeout | `lib/session.js` |
| Auth guard and request id propagation | `lib/requireAuth.js` |
| Role guard | `lib/requireRole.js` |
| Login, logout, current user APIs | `pages/api/auth/login.js`, `pages/api/auth/logout.js`, `pages/api/auth/me.js` |
| Browser session-slot wiring | `pages/_app.js`, `pages/login.js`, `components/LogoutButton.js` |
| Persisted session schema | `prisma/schema.prisma` (`Session`) |

## Session model

- Login creates a `Session` row with a random token, `userId`, `expiresAt`, and
  `lastActivityAt`.
- The token is stored in an HTTP-only cookie named `cienergy_session_<slot>`.
- Valid slots are `1`, `2`, `3`, and `4`; invalid or missing slot values fall
  back to slot `1`.
- Cookies use `Path=/`, `HttpOnly`, `SameSite=Lax`, and a 30-day max age.
  Production cookies also include `Secure`.
- Sessions expire in two ways:
  - **Absolute max age:** 30 days after creation.
  - **Inactivity timeout:** 15 minutes after the last authenticated request.
- `getSession` deletes expired or inactive rows lazily when the token is next
  presented. Any successful authenticated request refreshes `lastActivityAt`.
- If the user is missing or inactive, authentication fails. Deactivating a user
  therefore blocks future authenticated requests for existing cookies.

## Browser flow

1. `_app.js` stores the active slot in `sessionStorage.sessionSlot`.
   - `/login?slot=2`, `/login?slot=3`, and `/login?slot=4` switch the tab to
     that slot.
   - A tab with no explicit slot uses slot `1`.
2. `_app.js` patches `window.fetch` to add `X-Session-Slot: <slot>` to browser
   fetch calls.
3. `POST /api/auth/login` validates email/password, creates the session cookie
   for the requested request-body `slot`, records a `login` audit event, and
   returns `{ id, email, role }`.
4. Frontend login redirects by role:
   - `ADMIN` -> `/admin/dashboard`
   - `OPS` -> `/ops/dashboard`
   - `FINANCE` -> `/finance/dashboard`
   - `BUYER` -> `/buyer/dashboard`
5. `POST /api/auth/logout` reads the active slot from `X-Session-Slot`, deletes
   that session row, clears the matching cookie, and redirects to `/login`.

Use `LogoutButton` for UI logout controls so the patched fetch sends the active
slot header. A plain form post does not include that header and can clear the
wrong slot when a tester is using the multi-session demo links.

## Protecting API routes

Use `requireAuth` for every endpoint that needs a logged-in user:

```js
export default requireAuth(async function handler(req, res) {
  res.status(200).json({ userId: req.session.userId });
});
```

Use `requireRole` inside `requireAuth` when a route is role-gated:

```js
export default requireAuth(
  requireRole(["ADMIN", "FINANCE"], async function handler(req, res) {
    res.status(200).json({ ok: true });
  })
);
```

`requireAuth` attaches `req.session` with `userId`, `role`, `orgId`, and `user`.
It also sets `req.requestId` and the response `x-request-id` header, reusing an
incoming `x-request-id`, `x-correlation-id`, or `x-amzn-trace-id` when present.

Expected failures:

| Failure | HTTP status | Source |
| --- | --- | --- |
| Missing cookie, expired session, inactive user, or wrong slot header | `401 Unauthorized` | `requireAuth` |
| `requireRole` used without `req.session` | `401 Unauthorized - No session found` | `requireRole` |
| Authenticated user with a disallowed role | `403 Forbidden` | `requireRole` |

## Manual API checks

Log in and store the slot-specific cookie:

```bash
curl -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@cienergy.in","password":"demo123","slot":1}' \
  http://localhost:3000/api/auth/login
```

Call an authenticated endpoint with the matching slot header:

```bash
curl -i -b cookies.txt \
  -H "X-Session-Slot: 1" \
  http://localhost:3000/api/auth/me
```

Log out of that slot:

```bash
curl -i -b cookies.txt \
  -H "X-Session-Slot: 1" \
  -X POST \
  http://localhost:3000/api/auth/logout
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Login succeeds but `/api/auth/me` returns 401 | Confirm the request sends cookies and the same `X-Session-Slot` that was used at login. |
| One tab logs out a different role | Use `LogoutButton` and verify `sessionStorage.sessionSlot` for that tab. |
| User is unexpectedly logged out after leaving the app open | The 15-minute inactivity timeout is enforced by server time and is refreshed only by authenticated API requests. |
| Role-protected API returns 403 | Check the route's `requireRole` list and the user's persisted `role`. |
| Seeded tester cannot authenticate | Verify the user row is active and the password hash matches the seed data. |
