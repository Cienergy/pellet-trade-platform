export function requireRole(roles) {
    return (handler) => {
      return async (req, res) => {
        const user = req.user;
  
        if (!user || !roles.includes(user.role)) {
          return res.status(403).json({ error: "Forbidden" });
        }
  
        return handler(req, res);
      };
    };
  }
  