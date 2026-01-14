import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";
import { logAudit } from "../../../lib/audit";

async function handler(req, res) {
  const session = req.session;

  if (req.method === "GET") {
    const inventory = await prisma.inventory.findMany({
      include: {
        product: true,
        site: true,
      },
      orderBy: [
        { product: { name: "asc" } },
        { site: { name: "asc" } },
      ],
    });

    return res.status(200).json(inventory);
  }

  if (req.method === "POST") {
    const { productId, siteId, availableMT } = req.body;

    if (!productId || !siteId || availableMT == null) {
      return res.status(400).json({
        error: "productId, siteId, and availableMT are required",
      });
    }

    const inventory = await prisma.inventory.upsert({
      where: {
        productId_siteId: {
          productId,
          siteId,
        },
      },
      update: {
        availableMT: Number(availableMT),
        updatedBy: session.userId,
      },
      create: {
        productId,
        siteId,
        availableMT: Number(availableMT),
        updatedBy: session.userId,
      },
    });

    // Log inventory history
    await prisma.inventoryHistory.create({
      data: {
        productId,
        siteId,
        quantity: Number(availableMT),
        recordedBy: session.userId,
      },
    });

    await logAudit({
      actorId: session.userId,
      entity: "inventory",
      entityId: inventory.id,
      action: "updated",
    });

    return res.status(200).json(inventory);
  }

  return res.status(405).end();
}

export default requireAuth(requireRole("OPS", handler));

