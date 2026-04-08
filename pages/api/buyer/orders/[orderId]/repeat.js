import prisma from "../../../../../lib/prisma";
import requireAuth from "../../../../../lib/requireAuth";
import requireRole from "../../../../../lib/requireRole";
import { logAudit } from "../../../../../lib/audit";
import { canOrgPlaceNewOrder } from "../../../../../lib/creditCheck";

async function handler(req, res) {
  const session = req.session;
  const { orderId } = req.query;

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const original = await prisma.order.findUnique({
    where: { id: String(orderId) },
    select: {
      id: true,
      orgId: true,
      requestedProductId: true,
      requestedQuantityMT: true,
      deliveryLocation: true,
      notes: true,
    },
  });

  if (!original) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (original.orgId !== session.orgId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Credit / overdue check (same gate as normal order creation)
  const creditCheck = await canOrgPlaceNewOrder(prisma, session.orgId);
  if (!creditCheck.allowed) {
    return res.status(403).json({ error: creditCheck.reason });
  }

  const newOrder = await prisma.order.create({
    data: {
      orgId: session.orgId,
      createdBy: session.userId,
      status: "PENDING_APPROVAL",
      requestedQuantityMT: Number(original.requestedQuantityMT || 0),
      requestedProductId: original.requestedProductId,
      deliveryLocation: original.deliveryLocation || "",
      notes: original.notes || null,
      orderSource: "REPEAT",
    },
  });

  await logAudit({
    actorId: session.userId,
    req,
    entity: "order",
    entityId: newOrder.id,
    action: "repeated",
    metadata: { fromOrderId: original.id },
  });

  return res.status(201).json({ orderId: newOrder.id });
}

export default requireAuth(requireRole("BUYER", handler));

