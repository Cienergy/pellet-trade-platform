# Authentication and sessions (internal)

This page documents the cookie-backed session flow used by the Next.js API
routes. Treat it as the engineering reference when changing login, logout,
role guards, or multi-session demo behavior.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Session table fields | `prisma/schema.prisma` (`Session`) |
| Cookie naming, expiry, inactivity timeout | `lib/session.js` |
| Request id and 401 handling | `lib/requireAuth.js` |
| Role gates and 403 handling | `lib/requireRole.js` |
| Login, logout, current user | `pages/api/auth/login.js`, `pages/api/auth/logout.js`, `pages/api/auth/me.js` |
| Client session-slot header | `pages/_app.js` |
| Slot-aware logout button | `components/LogoutButton.js` |

## Session model

- A successful login creates one `Session` row with a random UUID token,
  `userId`, `expiresAt`, and `lastActivityAt`.
- Session cookies are named `cienergy_session_<slot>`, where `<slot>` is one
  of `1`, `2`, `3`, or `4`.
- Cookies are `HttpOnly`, `SameSite=Lax`, `Path=/`, and use `Secure` in
  production.
- Sessions have two expiry gates:
  - **Maximum age:** 30 days from creation.
  - **Inactivity timeout:** 15 minutes since `lastActivityAt`.
- Expired or inactive sessions are deleted lazily when `getSession` reads them.
- A session is valid only while the related user still exists and
  `user.active` is true.

## Login flow

```text
POST /api/auth/login
  -> validate email/password with bcrypt
  -> create Session row
  -> set cienergy_session_<slot> cookie
  -> audit action "login"
  -> return { id, email, role }
```

Request body:

```json
{
  "email": "buyer@example.com",
  "password": "password",
  "slot": 1
}
```

Constraints:

- `slot` is optional. Missing, invalid, or out-of-range values default to slot
  `1`.
- Login does not evict earlier sessions for the same user; each login creates a
  new row and sets the cookie for the selected slot.
- Inactive users receive the same `401 Invalid credentials` response as invalid
  passwords.

## Multi-session slots

The four cookie slots support the demo workflow where one browser can hold
multiple role sessions at the same time.

- Visiting `/login?slot=2`, `/login?slot=3`, or `/login?slot=4` stores the slot
  in `sessionStorage.sessionSlot`.
- `pages/_app.js` patches browser `fetch` to send `X-Session-Slot` on API
  calls.
- Server-side session lookup reads `X-Session-Slot` and chooses
  `cienergy_session_<slot>`.
- If the header is absent or invalid, the server reads slot `1`.

Use `components/LogoutButton.js` for client logout links/buttons so the patched
`fetch` sends the slot header. A plain HTML form POST may log out slot `1`
instead of the visible tab's active slot.

## Auth wrappers

Protected API routes should wrap handlers as:

```js
export default requireAuth(requireRole(["ADMIN", "OPS"], handler));
```

When methods on the same route have different role policies, wrap per method
inside the authenticated handler:

```js
export default requireAuth(async function route(req, res) {
  if (req.method === "GET") {
    return requireRole(["ADMIN", "OPS"], handler)(req, res);
  }

  if (req.method === "POST") {
    return requireRole("ADMIN", handler)(req, res);
  }

  return res.status(405).end();
});
```

`requireAuth` behavior:

- Adds `req.requestId`.
- Returns `x-request-id` on every protected request.
- Reuses an incoming `x-request-id`, `x-correlation-id`, or
  `x-amzn-trace-id` when present; otherwise it generates a UUID.
- Returns `401 { "error": "Unauthorized" }` when no valid session is found.

`requireRole` behavior:

- Expects `req.session` to be present.
- Accepts either one role string or an array of roles.
- Returns `403 { "error": "Forbidden" }` when the authenticated role is not
  allowed.

## Manual checks

Login with curl and store cookies:

```bash
curl -i -c /tmp/cienergy-slot1.txt \
  -H 'Content-Type: application/json' \
  -d '{"email":"buyer@example.com","password":"password","slot":1}' \
  http://localhost:3000/api/auth/login
```

Read the current user with the matching slot header:

```bash
curl -i -b /tmp/cienergy-slot1.txt \
  -H 'X-Session-Slot: 1' \
  http://localhost:3000/api/auth/me
```

Log out the same slot:

```bash
curl -i -b /tmp/cienergy-slot1.txt \
  -H 'X-Session-Slot: 1' \
  -X POST \
  http://localhost:3000/api/auth/logout
```

## Troubleshooting

| Symptom | Likely cause | Check |
| --- | --- | --- |
| `401 Unauthorized` immediately after login | Request is reading a different slot than the cookie that was set | Confirm `X-Session-Slot` matches `cienergy_session_<slot>` |
| `401 Unauthorized` after idle time | Session exceeded the 15-minute inactivity timeout | Log in again and inspect `Session.lastActivityAt` if needed |
| `401 Unauthorized` for a known user | User is inactive or the session row expired/deleted | Check `User.active`, `Session.expiresAt`, and whether the cookie token exists |
| `403 Forbidden` | Session is valid, but the role is not allowed by `requireRole` | Compare `req.session.role` with the route's allowed role list |
| Logout affects the wrong tab | Logout request did not include `X-Session-Slot` | Use `LogoutButton` or send the slot header manually |
