import { prisma } from "../../../../lib/prisma";

export default async function handler(req, res) {
  // TODO: admin auth
  const isAdmin = true;
  if (!isAdmin) {
    return res.status(403).json({ error: "Admin only" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { productId, availableMT } = req.body;

  if (!productId || availableMT == null) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const inventory = await prisma.inventory.upsert({
    where: { productId },
    update: { availableMT },
    create: {
      productId,
      availableMT,
      reservedMT: 0
    }
  });

  await prisma.auditLog.create({
    data: {
      entity: "Inventory",
      entityId: inventory.id,
      action: "INITIALIZED"
    }
  });

  res.status(200).json(inventory);
}
