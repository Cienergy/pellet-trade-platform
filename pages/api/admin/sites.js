import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";
import { logAudit } from "../../../lib/audit";

async function handler(req, res) {
  const session = req.session;

  if (req.method === "GET") {
    const sites = await prisma.site.findMany({
      orderBy: { name: "asc" },
    });

    return res.status(200).json(sites);
  }

  if (req.method === "POST") {
    const { name, city, state } = req.body;

    if (!name || !city || !state) {
      return res.status(400).json({
        error: "name, city, and state are required",
      });
    }

    const site = await prisma.site.create({
      data: {
        name,
        city,
        state,
        active: true,
      },
    });

    await logAudit({
      actorId: session.userId,
      entity: "site",
      entityId: site.id,
      action: "created",
    });

    return res.status(201).json(site);
  }

  return res.status(405).end();
}

export default requireAuth(async function(req, res) {
  const session = req.session;
  
  // GET: Allow ADMIN, OPS, and BUYER (buyers need sites for order creation)
  if (req.method === "GET") {
    if (session.role !== "ADMIN" && session.role !== "OPS" && session.role !== "BUYER") {
      return res.status(403).json({ error: "Forbidden" });
    }
    return handler(req, res);
  }
  
  // POST: Only ADMIN
  if (req.method === "POST") {
    if (session.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    return handler(req, res);
  }
  
  return res.status(405).end();
});

