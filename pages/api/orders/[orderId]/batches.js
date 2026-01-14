import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";
import { logAudit } from "../../../lib/audit";

async function handler(req, res) {
  const { orderId } = req.query;
  const session = req.session;

  if (req.method === "GET") {
    try {
      const batches = await prisma.orderBatch.findMany({
        where: { orderId },
        include: {
          product: true,
          site: true,
          invoice: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json(batches);
    } catch (err) {
      console.error("GET BATCHES ERROR:", err);
      return res.status(500).json({ error: "Failed to fetch batches" });
    }
  }

  if (req.method === "POST") {
    try {
      const { productId, siteId, quantityMT } = req.body;

      if (!productId || !siteId || !quantityMT) {
        return res.status(400).json({ 
          error: "productId, siteId, and quantityMT are required" 
        });
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          batches: true,
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Get product for pricing
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Create batch
      const batch = await prisma.orderBatch.create({
        data: {
          orderId,
          productId,
          siteId,
          quantityMT: Number(quantityMT),
          status: "CREATED",
          createdBy: session.userId,
        },
        include: {
          product: true,
          site: true,
        },
      });

      // Auto-generate invoice for the batch
      const subtotal = batch.quantityMT * product.pricePMT;
      const gstRate = 5; // Default GST rate, can be made configurable
      const gstAmount = (subtotal * gstRate) / 100;
      const totalAmount = subtotal + gstAmount;

      const invoice = await prisma.invoice.create({
        data: {
          batchId: batch.id,
          number: `INV-${Date.now()}-${batch.id.slice(0, 8)}`,
          subtotal,
          gstType: "GST",
          gstRate,
          gstAmount,
          totalAmount,
          status: "CREATED",
        },
      });

      // Update batch status to INVOICED
      const updatedBatch = await prisma.orderBatch.update({
        where: { id: batch.id },
        data: { status: "INVOICED" },
        include: {
          product: true,
          site: true,
          invoice: true,
        },
      });

      await logAudit({
        actorId: session.userId,
        entity: "orderBatch",
        entityId: batch.id,
        action: "created",
      });

      await logAudit({
        actorId: session.userId,
        entity: "invoice",
        entityId: invoice.id,
        action: "auto_generated",
      });

      return res.status(201).json(updatedBatch);
    } catch (err) {
      console.error("CREATE BATCH ERROR:", err);
      return res.status(500).json({ error: err.message || "Failed to create batch" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default requireAuth(requireRole(["ADMIN", "OPS"], handler));