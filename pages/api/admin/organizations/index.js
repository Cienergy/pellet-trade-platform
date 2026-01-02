import { prisma } from "../../../../lib/prisma";

export default async function handler(req, res) {
  // TODO: replace with real auth check
  const isAdmin = true;
  if (!isAdmin) {
    return res.status(403).json({ error: "Admin only" });
  }

  if (req.method === "GET") {
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json(orgs);
  }

  if (req.method === "POST") {
    const { name, gst, state } = req.body;

    if (!name || !state) {
      return res.status(400).json({ error: "Name and state are required" });
    }

    const org = await prisma.organization.create({
      data: { name, gst, state }
    });

    await prisma.auditLog.create({
      data: {
        entity: "Organization",
        entityId: org.id,
        action: "CREATED"
      }
    });

    return res.status(201).json(org);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
