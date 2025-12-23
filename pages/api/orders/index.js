const { prisma } = require("../../../lib/prisma");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { orgId, type } = req.body;

  if (!orgId || !type) {
    return res.status(400).json({ error: "orgId and type required" });
  }

  const order = await prisma.order.create({
    data: {
      orgId,
      type, // scheduled | non_scheduled
      status: "created",
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "order",
      entityId: order.id,
      action: "created",
    },
  });

  return res.status(201).json(order);
}
