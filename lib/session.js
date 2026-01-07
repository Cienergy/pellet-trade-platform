import cookie from "cookie";

const SESSION_COOKIE = "cienergy_session";

export function createSession(res, session) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize(
      SESSION_COOKIE,
      JSON.stringify(session),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }
    )
  );
}

export function getSession(req) {
  if (!req || !req.headers || !req.headers.cookie) return null;

  const cookies = cookie.parse(req.headers.cookie);
  if (!cookies[SESSION_COOKIE]) return null;

  try {
    return JSON.parse(cookies[SESSION_COOKIE]);
  } catch {
    return null;
  }
}
