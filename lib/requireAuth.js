import { getSession } from "./session";

export function requireAuth(handler) {
  return async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.session = session;
    return handler(req, res);
  };
}
