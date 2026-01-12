import { getSession } from "../../../lib/session";

export default async function handler(req, res) {
  const session = getSession(req);

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  return res.status(200).json(session);
}
