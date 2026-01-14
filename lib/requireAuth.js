import { getSession } from "./session";

export default function requireAuth(handler) {
  return async function (req, res) {
    const session = await getSession(req);

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.session = session;
    return handler(req, res);
  };
}
