export function requireRole(roles, handler) {
    return async function (req, res) {
      if (!req.session || !roles.includes(req.session.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      return handler(req, res);
    };
  }
  