import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";
import { logAudit } from "../../../../lib/audit";
import { calculateGST } from "../../../../lib/gst";
import { canOrgPlaceNewOrder } from "../../../../lib/creditCheck";

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
          invoices: { include: { payments: true } },
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

      // Credit / overdue check: block new batch if buyer has overdue or exceeds credit limit
      const creditCheck = await canOrgPlaceNewOrder(prisma, orderWithOrg.org.id);
      if (!creditCheck.allowed) {
        return res.status(403).json({ error: creditCheck.reason });
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
      const org = orderWithOrg.org;
      const validTerms = ["NET_15", "NET_30", "NET_60", "NET_90"];
      const paymentTerm = (org.defaultPaymentTerm && validTerms.includes(org.defaultPaymentTerm))
        ? org.defaultPaymentTerm
        : "NET_30";

      const paymentMode = org.defaultPaymentMode || "NET_TERMS";
      const advancePercent = paymentMode === "ADVANCE_BALANCE" && org.advancePercent != null && org.advancePercent > 0 && org.advancePercent < 100
        ? Number(org.advancePercent)
        : null;

      const baseTs = String(Date.now());
      const invoiceNumber = (suffix) => `INV-${new Date().toISOString().slice(0, 7).replace(/-/, "")}-${baseTs.slice(-6)}${suffix ? `-${suffix}` : ""}`;

      if (advancePercent != null) {
        // ADVANCE_BALANCE: create ADVANCE + BALANCE invoices
        const advanceValue = (transactionValue * advancePercent) / 100;
        const balanceValue = transactionValue - advanceValue;
        const gstAdvance = calculateGST({
          transactionValue: advanceValue,
          buyerState: org.state,
          sellerState: site.state,
          gstRate: 12,
        });
        const gstBalance = calculateGST({
          transactionValue: balanceValue,
          buyerState: org.state,
          sellerState: site.state,
          gstRate: 12,
        });

        const advanceInvoice = await prisma.invoice.create({
          data: {
            batchId: batch.id,
            number: invoiceNumber("A"),
            subtotal: advanceValue,
            gstType: gstAdvance.gstType,
            gstRate: gstAdvance.gstRate,
            gstAmount: gstAdvance.gstAmount,
            cgst: gstAdvance.cgst,
            sgst: gstAdvance.sgst,
            igst: gstAdvance.igst,
            totalAmount: gstAdvance.totalAmount,
            paymentTerm,
            status: "CREATED",
            invoiceType: "ADVANCE",
            advancePercent,
            earlyPayDiscountPercent: org.earlyPayDiscountPercent ?? undefined,
            earlyPayDiscountDays: org.earlyPayDiscountDays ?? undefined,
          },
        });

        const deliveryAt = batch.deliveryAt || new Date();
        const retentionDue = org.retentionPercent != null && org.retentionDays != null
          ? new Date(deliveryAt)
          : null;
        if (retentionDue && org.retentionDays) retentionDue.setDate(retentionDue.getDate() + org.retentionDays);

        await prisma.invoice.create({
          data: {
            batchId: batch.id,
            number: invoiceNumber("B"),
            subtotal: balanceValue,
            gstType: gstBalance.gstType,
            gstRate: gstBalance.gstRate,
            gstAmount: gstBalance.gstAmount,
            cgst: gstBalance.cgst,
            sgst: gstBalance.sgst,
            igst: gstBalance.igst,
            totalAmount: gstBalance.totalAmount,
            paymentTerm,
            status: "CREATED",
            invoiceType: "BALANCE",
            parentInvoiceId: advanceInvoice.id,
            advancePercent,
            dueDateOverride: paymentMode === "PAY_BEFORE_DISPATCH" ? (batch.deliveryAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) : undefined,
            earlyPayDiscountPercent: org.earlyPayDiscountPercent ?? undefined,
            earlyPayDiscountDays: org.earlyPayDiscountDays ?? undefined,
            retentionPercent: org.retentionPercent ?? undefined,
            retentionDueDate: retentionDue ?? undefined,
          },
        });

        await logAudit({ actorId: session.userId, entity: "invoice", entityId: advanceInvoice.id, action: "auto_generated" });
      } else {
        // Single STANDARD invoice
        const gstCalculation = calculateGST({
          transactionValue,
          buyerState: org.state,
          sellerState: site.state,
          gstRate: 12,
        });
        const deliveryAt = batch.deliveryAt || new Date();
        let retentionDueDate = null;
        if (org.retentionPercent != null && org.retentionDays != null) {
          retentionDueDate = new Date(deliveryAt);
          retentionDueDate.setDate(retentionDueDate.getDate() + org.retentionDays);
        }

        const invoice = await prisma.invoice.create({
          data: {
            batchId: batch.id,
            number: invoiceNumber(),
            subtotal: transactionValue,
            gstType: gstCalculation.gstType,
            gstRate: gstCalculation.gstRate,
            gstAmount: gstCalculation.gstAmount,
            cgst: gstCalculation.cgst,
            sgst: gstCalculation.sgst,
            igst: gstCalculation.igst,
            totalAmount: gstCalculation.totalAmount,
            paymentTerm,
            status: "CREATED",
            invoiceType: "STANDARD",
            dueDateOverride: paymentMode === "PAY_BEFORE_DISPATCH" ? (batch.deliveryAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) : undefined,
            earlyPayDiscountPercent: org.earlyPayDiscountPercent ?? undefined,
            earlyPayDiscountDays: org.earlyPayDiscountDays ?? undefined,
            retentionPercent: org.retentionPercent ?? undefined,
            retentionDueDate: retentionDueDate ?? undefined,
          },
        });
        await logAudit({ actorId: session.userId, req, entity: "invoice", entityId: invoice.id, action: "auto_generated" });
      }

      const updatedBatch = await prisma.orderBatch.update({
        where: { id: batch.id },
        data: { status: "INVOICED" },
        include: {
          product: true,
          site: true,
          invoices: true,
        },
      });

      await logAudit({
        actorId: session.userId,
        req,
        entity: "orderBatch",
        entityId: batch.id,
        action: "created",
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