export default function requireRole(roleOrRoles, handler) {
  return async function (req, res) {
    if (!req.session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Support both string and array of roles
    const allowedRoles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    
    if (!allowedRoles.includes(req.session.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return handler(req, res);
  };
}
