import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const buyers = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json(buyers);
}

export default requireAuth(requireRole("ADMIN", handler));
