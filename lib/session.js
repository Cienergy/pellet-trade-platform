const COOKIE_NAME = "session";

export function createSession(res, session) {
  const value = Buffer.from(JSON.stringify(session)).toString("base64");

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax`
  );
}

export function getSession(req) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;

  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  try {
    return JSON.parse(
      Buffer.from(match[1], "base64").toString("utf8")
    );
  } catch {
    return null;
  }
}

export function clearSession(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}
