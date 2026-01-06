import { parse } from "cookie";

export function getSession(req) {
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const parsed = parse(cookies);
  if (!parsed.session) return null;

  try {
    return JSON.parse(parsed.session);
  } catch {
    return null;
  }
}
