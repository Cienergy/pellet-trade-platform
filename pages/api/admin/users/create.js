import { prisma } from "../../../../lib/prisma";
import { requireAuth } from "../../../../lib/requireAuth";
import { requireRole } from "../../../../lib/requireRole";
import bcrypt from "bcryptjs";

const ALLOWED_ROLES = ["admin", "ops", "finance", "buyer"];

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, role, orgId, password } = req.body;
  if (!email || !role || !orgId || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, role, orgId, passwordHash },
  });

  return res.status(201).json(user);
}

export default requireAuth(requireRole(["admin"], handler));
