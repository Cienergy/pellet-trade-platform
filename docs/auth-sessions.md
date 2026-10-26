# Auth and sessions (internal)

This page documents the API authentication and session behavior implemented in
the Next.js handlers. Use it when changing login/logout behavior, adding
protected API routes, or debugging role and session failures.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Session cookie names, slot selection, expiry, and inactivity checks | `lib/session.js` |
| Request authentication wrapper and request id handling | `lib/requireAuth.js` |
| Role authorization wrapper | `lib/requireRole.js` |
| Login, logout, and current-user APIs | `pages/api/auth/login.js`, `pages/api/auth/logout.js`, `pages/api/auth/me.js` |
| Browser session-slot propagation | `pages/_app.js`, `pages/login.js`, `components/LogoutButton.js` |
| Session storage schema | `prisma/schema.prisma` (`Session`) |

## Session model

Sessions are database-backed and identified by random UUID tokens stored in
HttpOnly cookies.

| Field | Purpose |
| --- | --- |
| `Session.token` | Unique bearer token stored in a cookie. |
| `Session.userId` | User relation used to load the authenticated user's role and organization. |
| `Session.expiresAt` | Absolute maximum lifetime used by `getSession`. |
| `Session.lastActivityAt` | Sliding inactivity timestamp updated on each authenticated request. |

`createSession` sets:

- `expiresAt` to 30 days from login.
- `lastActivityAt` to the login time.
- Cookie attributes: `Path=/`, `HttpOnly`, `SameSite=Lax`, `Max-Age=30 days`,
  and `Secure` when `NODE_ENV=production`.

`getSession` rejects a request when:

- The selected cookie is missing.
- The token does not match a stored session.
- The related user is missing or inactive.
- `expiresAt` has passed.
- More than 15 minutes have passed since `lastActivityAt`.

Expired or inactive sessions are deleted before returning `401`.

## Session slots

The app supports four browser session slots so testers can keep multiple roles
open in separate tabs.

| Slot input | Cookie name |
| --- | --- |
| `1` or missing/invalid slot | `cienergy_session_1` |
| `2` | `cienergy_session_2` |
| `3` | `cienergy_session_3` |
| `4` | `cienergy_session_4` |

Slot selection rules:

- `POST /api/auth/login` accepts a numeric `slot` in the JSON body and writes
  the corresponding cookie.
- For authenticated requests, `lib/session.js` reads `X-Session-Slot` and falls
  back to slot `1` when the header is missing or invalid.
- `pages/_app.js` stores `?slot=1..4` in `sessionStorage` and patches
  `window.fetch` to send `X-Session-Slot` on browser API requests.
- `components/LogoutButton.js` uses client-side `fetch` so logout includes the
  slot header. A plain form POST or direct request without `X-Session-Slot`
  logs out slot `1`.

Manual curl example for slot `2`:

```bash
curl -i \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@example.com","password":"...","slot":2}' \
  http://localhost:3000/api/auth/login

curl -i \
  -H "Cookie: cienergy_session_2=<token>" \
  -H "X-Session-Slot: 2" \
  http://localhost:3000/api/auth/me
```

## Guard pattern for API routes

Most protected routes compose `requireAuth` outside `requireRole`:

```js
export default requireAuth(requireRole(["ADMIN", "OPS"], handler));
```

When methods have different role requirements, keep authentication outermost and
choose the role wrapper inside the method switch:

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

`requireAuth` adds a request id before session validation:

- Uses `X-Request-Id`, `X-Correlation-Id`, or `X-Amzn-Trace-Id` when present.
- Generates a UUID when no incoming id is supplied.
- Sets `req.requestId` and response header `x-request-id`.

`requireRole` expects `req.session` to already exist. If it is used without
`requireAuth`, it returns `401` because no session was attached.

## Expected responses

| Condition | Response |
| --- | --- |
| Missing/expired/inactive session | `401 {"error":"Unauthorized"}` from `requireAuth` |
| `requireRole` called without `req.session` | `401 {"error":"Unauthorized - No session found"}` |
| Authenticated user lacks an allowed role | `403 {"error":"Forbidden"}` |
| Unsupported auth method on login/logout | `405` |

## Developer checklist

When adding or changing a protected route:

1. Wrap the exported handler with `requireAuth`.
2. Add `requireRole` unless every authenticated role should have access.
3. For BUYER routes, scope records by `req.session.orgId`; role checks alone do
   not enforce organization isolation.
4. If the route is called from the browser, use `fetch` after `_app` has loaded
   so `X-Session-Slot` is attached automatically.
5. If a route runs outside the browser patch, send both the selected session
   cookie and `X-Session-Slot` explicitly.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Login succeeds but `/api/auth/me` returns `401` | Confirm the request sends the cookie for the same slot as `X-Session-Slot`. |
| A tab unexpectedly becomes unauthorized | The 15-minute inactivity window may have elapsed; re-login for that slot. |
| Logout clears the wrong role during multi-session testing | Use `LogoutButton` or include `X-Session-Slot`; requests without the header target slot `1`. |
| Role route returns `403` | Confirm the user role in `/api/auth/me` and the route's `requireRole` list. |
| Session writes or reads fail after deployment | Run `npx prisma migrate deploy` and confirm the `Session` table has `id`, `token`, `userId`, `expiresAt`, and `lastActivityAt`. |
