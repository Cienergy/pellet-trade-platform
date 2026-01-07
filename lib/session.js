import cookie from "cookie";

export function setSession(res, session) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize(
      "cienergy_session",
      JSON.stringify(session),
      {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
      }
    )
  );
}

export function clearSession(res) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("cienergy_session", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    })
  );
}

export function getSession(req) {
  const cookies = cookie.parse(req.headers.cookie || "");
  if (!cookies.cienergy_session) return null;

  try {
    return JSON.parse(cookies.cienergy_session);
  } catch {
    return null;
  }
}
