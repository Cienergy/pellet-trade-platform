import { requireAuth } from "./requireAuth";

export function requireRole(roles, handler) {
  return requireAuth((req, res) => {
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return handler(req, res);
  });
}
