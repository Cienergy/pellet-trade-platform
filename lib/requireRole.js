export default function requireRole(roleOrRoles, handler) {
  return async function (req, res) {
    if (!req.session) {
      return res.status(401).json({ error: "Unauthorized - No session found" });
    }

    // Support both string and array of roles
    const allowedRoles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    
    if (!allowedRoles.includes(req.session.role)) {
      console.error(`[requireRole] Access denied. User role: ${req.session.role}, Required roles: ${allowedRoles.join(", ")}`);
      return res.status(403).json({ 
        error: `Forbidden - Your role '${req.session.role}' does not have permission. Required roles: ${allowedRoles.join(" or ")}` 
      });
    }

    return handler(req, res);
  };
}
