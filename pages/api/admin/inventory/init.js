import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { productId, siteId, availableMT } = req.body;
  const session = req.session;

  if (!productId || !siteId || availableMT == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const inventory = await prisma.inventory.upsert({
    where: {
      productId_siteId: {
        productId,
        siteId,
      },
    },
    update: { 
      availableMT,
      updatedBy: session.userId,
    },
    create: {
      productId,
      siteId,
      availableMT,
      updatedBy: session.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "Inventory",
      entityId: inventory.id,
      action: "INITIALIZED",
      actorId: session.userId,
    },
  });

  res.status(200).json(inventory);
}

export default requireAuth(
  requireRole(["ADMIN", "OPS"], handler)
);

