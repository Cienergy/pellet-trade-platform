import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";

/** Legacy Supabase receipt redirect — disabled. */
async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(410).json({
    error: "This receipt endpoint is deprecated. Use the in-app invoice and payment views.",
  });
}

export default requireAuth(requireRole(["ADMIN", "FINANCE", "BUYER"], handler));
