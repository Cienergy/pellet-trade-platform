import { prisma } from "../../../../lib/prisma";
import { requireAuth } from "../../../../lib/requireAuth";
import { requireRole } from "../../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      orgId: true,
      createdAt: true,
    },
  });

  return res.status(200).json(users);
}

export default requireAuth(
  requireRole(["admin"], handler)
);
