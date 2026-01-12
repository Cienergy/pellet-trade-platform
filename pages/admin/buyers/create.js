import { prisma } from "../../../../lib/prisma";
import { requireAuth } from "../../../../lib/requireAuth";
import { requireRole } from "../../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { name, gst, state } = req.body;
  if (!name || !state) {
    return res.status(400).json({ error: "Name and state required" });
  }

  const buyer = await prisma.organization.create({
    data: { name, gst, state },
  });

  return res.status(201).json(buyer);
}

export default requireAuth(requireRole(["admin"], handler));
