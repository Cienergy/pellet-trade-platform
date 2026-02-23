import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";
import { logAudit } from "../../../../lib/audit";
import { calculateGST } from "../../../../lib/gst";

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
      const { productId, siteId, quantityMT, deliveryAt } = req.body;

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

      // Only allow batch creation for ACCEPTED orders
      if (order.status !== "ACCEPTED") {
        return res.status(400).json({ 
          error: `Cannot create batches for order with status: ${order.status}. Order must be ACCEPTED first.` 
        });
      }

      // Calculate remaining quantity
      const requestedMT = order.requestedQuantityMT;
      if (!requestedMT || requestedMT <= 0) {
        return res.status(400).json({ 
          error: "Order does not have a valid requested quantity. Please contact support." 
        });
      }
      
      const batchedMT = order.batches.reduce((sum, b) => sum + b.quantityMT, 0);
      const remainingMT = Math.max(0, requestedMT - batchedMT);
      const requestedBatchQty = Number(quantityMT);

      // Validate batch quantity
      if (requestedBatchQty <= 0) {
        return res.status(400).json({ 
          error: "Batch quantity must be greater than 0" 
        });
      }

      // Validate batch quantity doesn't exceed remaining
      if (requestedBatchQty > remainingMT) {
        return res.status(400).json({ 
          error: `Batch quantity (${requestedBatchQty} MT) exceeds remaining order quantity (${remainingMT.toFixed(2)} MT). Order requested: ${requestedMT.toFixed(2)} MT, Already batched: ${batchedMT.toFixed(2)} MT` 
        });
      }

      // Get product, site, and order with org for pricing and GST calculation
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const site = await prisma.site.findUnique({
        where: { id: siteId },
      });

      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      const orderWithOrg = await prisma.order.findUnique({
        where: { id: orderId },
        include: { org: true },
      });

      if (!orderWithOrg || !orderWithOrg.org) {
        return res.status(404).json({ error: "Order or organization not found" });
      }

      // Create batch
      const batch = await prisma.orderBatch.create({
        data: {
          orderId,
          productId,
          siteId,
          quantityMT: Number(quantityMT),
          status: "CREATED",
          deliveryAt: deliveryAt ? new Date(deliveryAt) : null,
          createdBy: session.userId,
        },
        include: {
          product: true,
          site: true,
        },
      });

      // Calculate transaction value (Quantity × Price) for GST
      const transactionValue = batch.quantityMT * product.pricePMT;
      
      // Auto-classify intra/inter-state and calculate GST
      const gstCalculation = calculateGST({
        transactionValue,
        buyerState: orderWithOrg.org.state,
        sellerState: site.state,
        gstRate: 12, // Default 12% GST, can be made configurable
      });

      // Payment term - default to NET_30, can be made configurable per order/contract
      const paymentTerm = "NET_30"; // Will be enforced to NET_30, NET_60, or NET_90 only

      // Generate invoice number
      const invoiceNumber = `INV-${new Date().toISOString().slice(0, 7).replace(/-/, "")}-${String(Date.now()).slice(-6)}`;

      const invoice = await prisma.invoice.create({
        data: {
          batchId: batch.id,
          number: invoiceNumber,
          subtotal: transactionValue,
          gstType: gstCalculation.gstType,
          gstRate: gstCalculation.gstRate,
          gstAmount: gstCalculation.gstAmount,
          cgst: gstCalculation.cgst,
          sgst: gstCalculation.sgst,
          igst: gstCalculation.igst,
          totalAmount: gstCalculation.totalAmount,
          paymentTerm: paymentTerm,
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