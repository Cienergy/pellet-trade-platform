# Auth and sessions (internal)

This page documents the login, session, authorization, and request tracing flow
implemented in the Next.js API routes. Treat it as the engineering reference
when changing auth helpers, route guards, login/logout behavior, or audit
metadata.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Session schema | `prisma/schema.prisma` (`Session`) |
| Password check | `pages/api/auth/login.js`, `lib/auth.js` |
| Session creation, lookup, expiry, logout | `lib/session.js` |
| Request authentication wrapper | `lib/requireAuth.js` |
| Role wrapper | `lib/requireRole.js` |
| Frontend session slot handling | `pages/_app.js`, `pages/login.js`, `components/LogoutButton.js` |
| Current-user endpoint | `pages/api/auth/me.js` |
| Audit event metadata | `lib/audit.js` |

## Session model

Sessions are database-backed and keyed by an opaque token stored in an
HttpOnly cookie.

- `POST /api/auth/login` accepts `email`, `password`, and optional `slot`.
- Login only succeeds for an active user whose bcrypt password matches.
- `createSession` writes a `Session` row with:
  - `id`: generated UUID
  - `token`: generated UUID, unique
  - `userId`: the authenticated user
  - `expiresAt`: 30 days from login
  - `lastActivityAt`: login time
- The cookie name is `cienergy_session_<slot>`, where slot must be `1`, `2`,
  `3`, or `4`. Invalid or missing slots default to `1`.
- Cookie attributes are `Path=/`, `HttpOnly`, `SameSite=Lax`, and `Max-Age`
  for 30 days. Production also adds `Secure`.
- Role and organization are not stored in the cookie. `getSession` reloads the
  related `User` on each authenticated request, so deactivating a user or
  changing their role takes effect on the next request.

## Request flow

```text
browser fetch -> X-Session-Slot header -> requireAuth -> getSession
  -> select cienergy_session_<slot> cookie -> Session lookup -> active User
  -> update lastActivityAt -> req.session -> requireRole -> handler
```

`getSession` rejects and deletes a presented session when:

- the token is missing from the selected cookie,
- the `Session` row or related active `User` is missing,
- `expiresAt` has passed, or
- `lastActivityAt` is more than 15 minutes old.

On a valid request, `lastActivityAt` is updated to the current time. Expired or
idle sessions are cleaned up only when their token is presented to `getSession`;
there is no background sweeper in the current code.

## Multi-session slots

The app supports up to four browser sessions for demo and cross-role testing.

- `pages/_app.js` reads `?slot=1..4` and stores the value in
  `sessionStorage.sessionSlot`.
- The app patches `window.fetch` to send `X-Session-Slot` with the stored slot.
- Login also sends the slot in the JSON body so the API sets the matching
  cookie.
- `LogoutButton` uses `fetch("/api/auth/logout")` so the patched header is
  included and only the active slot is cleared.

Example manual login for slot 2:

```bash
curl -i \
  -H "Content-Type: application/json" \
  -d '{"email":"ops@cienergy.in","password":"demo123","slot":2}' \
  https://example.com/api/auth/login
```

When calling authenticated APIs manually, send both the selected cookie and the
slot header:

```bash
curl \
  -H "Cookie: cienergy_session_2=<token>" \
  -H "X-Session-Slot: 2" \
  https://example.com/api/auth/me
```

Without `X-Session-Slot`, the server reads slot `1`.

## Route guard pattern

Use `requireAuth` before `requireRole` on protected API routes:

```js
export default requireAuth(requireRole(["ADMIN", "OPS"], handler));
```

If a route has method-specific role rules, apply `requireRole` inside the
authenticated wrapper:

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

`requireAuth` returns `401` when there is no valid session. `requireRole`
returns `403` when the session role is not allowed.

## Request IDs and audit logs

`requireAuth` normalizes request tracing for protected routes:

- It prefers an incoming `x-request-id`, `x-correlation-id`, or
  `x-amzn-trace-id`.
- If none is present, it generates a UUID.
- It stores the value on `req.requestId` and returns it as the `x-request-id`
  response header.

Pass `req` to `logAudit` when possible. The audit helper stores:

- `requestId` from `req.requestId` or the incoming header,
- `ip` from `x-forwarded-for` or the socket address,
- `userAgent` from the request headers,
- optional structured `metadata`.

Audit failures are logged to the server console and do not block the main API
flow.

## Setup and troubleshooting

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Login succeeds locally but fails after deploy | `Session` table or required columns are missing | Run `npx prisma migrate deploy` against the target database. `Session.id`, `token`, `userId`, `expiresAt`, and `lastActivityAt` must exist. |
| Authenticated API returns `401` after inactivity | 15-minute idle timeout elapsed | Re-login. The stale session row is deleted the next time it is presented. |
| Authenticated API returns `401` before 30 days | User was deactivated, session row was deleted, or wrong slot was selected | Check `User.active`, the `Session` row, and `X-Session-Slot`. |
| Multi-role testing logs out the wrong account | Logout request defaulted to slot `1` | Use `LogoutButton` or a client-side `fetch` that sends `X-Session-Slot`. |
| Production login does not persist | Cookie marked `Secure` is being served over non-HTTPS | Use HTTPS in production or test locally with `NODE_ENV` not set to `production`. |
| Route returns `403` for a valid login | Role wrapper does not include the session role | Check the route's `requireRole` list and `req.session.role`. |

For deployment-level database and environment setup, see `DEPLOYMENT.md`.
