import { prisma } from "../../../lib/prisma";
import { calculateGST } from "../../../lib/gst";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { batchId, gstRate, buyerState, sellerState } = req.body;

  if (!batchId || !gstRate || !buyerState || !sellerState) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: { product: true }
  });

  if (!batch) {
    return res.status(404).json({ error: "Batch not found" });
  }

  const subtotal = batch.quantityMT * batch.product.pricePMT;

  const gst = calculateGST({
    subtotal,
    buyerState,
    sellerState,
    gstRate
  });

  const invoice = await prisma.invoice.create({
    data: {
      batchId,
      number: `INV-${Date.now()}`,
      subtotal,
      gstType: gst.gstType,
      gstRate,
      gstAmount: gst.gstAmount,
      totalAmount: gst.totalAmount,
      status: "ISSUED"
    }
  });

  await prisma.auditLog.create({
    data: {
      entity: "Invoice",
      entityId: invoice.id,
      action: "CREATED"
    }
  });

  res.status(201).json(invoice);
}
