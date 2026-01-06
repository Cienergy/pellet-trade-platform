import { prisma } from "../../../../lib/prisma";
import { requireAuth } from "../../../../lib/requireAuth";
import { requireRole } from "../../../../lib/requireRole";
import { hashPassword } from "../../../../lib/auth";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { email, role, orgId, password } = req.body;

  if (!email || !role || !orgId || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      role,
      orgId,
      passwordHash,
    },
  });

  return res.status(201).json({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

export default requireAuth(
  requireRole(["admin"])(handler)
);
