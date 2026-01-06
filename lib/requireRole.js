export function requireRole(roles) {
    return (handler) => {
      return async (req, res) => {
        if (!roles.includes(req.user.role)) {
          return res.status(403).json({ error: "Forbidden" });
        }
        return handler(req, res);
      };
    };
  }
  