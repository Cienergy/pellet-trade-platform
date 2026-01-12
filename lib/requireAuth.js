// lib/requireAuth.js

export default function requireAuth(handler, allowedRoles = []) {
  return async (req, res) => {
    try {
      const user = req.user; // or however you attach user in auth/me

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      return handler(req, res);
    } catch (err) {
      console.error("requireAuth error:", err);
      return res.status(500).json({ error: "Auth middleware failed" });
    }
  };
}
