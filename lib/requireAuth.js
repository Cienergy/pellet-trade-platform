import { getSession } from "./session";

export function requireAuth(handler) {
  return async (req, res) => {
    const session = getSession(req);

    if (!session || !session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = session;
    return handler(req, res);
  };
}
