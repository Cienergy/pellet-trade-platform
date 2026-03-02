import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";
import { logAudit } from "../../../../lib/audit";

async function handler(req, res) {
  if (req.method === "GET") {
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(orgs);
  }

  if (req.method === "POST") {
    const session = req.session;
    const { name, gst, state } = req.body;

    if (!name || !state) {
      return res.status(400).json({ error: "Name and state are required" });
    }

    const org = await prisma.organization.create({
      data: { name, gst, state },
    });

    await logAudit({
      actorId: session?.userId,
      entity: "organization",
      entityId: org.id,
      action: "created",
    });

    return res.status(201).json(org);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default requireAuth(requireRole("ADMIN", handler));
