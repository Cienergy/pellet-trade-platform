import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";
import { logAudit } from "../../../lib/audit";

async function handler(req, res) {
  const session = req.session;

  if (req.method === "POST") {
    const {
      batchId,
      committedMT,
      suppliedMT,
      dispatchImageUrl,
      freightCost,
      freightCurrency,
      freightVendorName,
      freightInvoiceRef,
      freightNotes,
    } = req.body;

    if (!batchId) {
      return res.status(400).json({ error: "batchId is required" });
    }

    // Dispatch image is mandatory
    if (!dispatchImageUrl || !dispatchImageUrl.trim()) {
      return res.status(400).json({ error: "dispatchImageUrl is required. Image upload is mandatory when dispatching material." });
    }

    const batch = await prisma.orderBatch.findUnique({
      where: { id: batchId },
      include: {
        order: true,
        product: true,
        site: true,
      },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    // Update batch with dispatch information
    const updateData = {
      dispatchedAt: new Date(),
      dispatchImageUrl: String(dispatchImageUrl).trim(),
    };

    if (committedMT !== undefined) {
      updateData.committedMT = Number(committedMT);
    }

    if (suppliedMT !== undefined) {
      updateData.suppliedMT = Number(suppliedMT);
    }

    // Update leftFromSiteAt if not already set
    if (!batch.leftFromSiteAt) {
      updateData.leftFromSiteAt = new Date();
    }

    if (freightCost !== undefined) {
      const n = freightCost === "" || freightCost == null ? null : Number(freightCost);
      if (n != null && (Number.isNaN(n) || n < 0)) {
        return res.status(400).json({ error: "freightCost must be a number >= 0" });
      }
      updateData.freightCost = n;
      updateData.freightCurrency = freightCurrency ? String(freightCurrency) : "INR";
      updateData.freightVendorName = freightVendorName ? String(freightVendorName) : null;
      updateData.freightInvoiceRef = freightInvoiceRef ? String(freightInvoiceRef) : null;
      updateData.freightNotes = freightNotes ? String(freightNotes) : null;
      updateData.freightEnteredAt = new Date();
      updateData.freightEnteredBy = session.userId;
    }

    const updatedBatch = await prisma.orderBatch.update({
      where: { id: batchId },
      data: updateData,
      include: {
        order: {
          include: { org: true },
        },
        product: true,
        site: true,
      },
    });

    await logAudit({
      actorId: session.userId,
      req,
      entity: "orderBatch",
      entityId: batchId,
      action: "dispatched",
    });

    if (freightCost !== undefined) {
      await logAudit({
        actorId: session.userId,
        req,
        entity: "orderBatch",
        entityId: batchId,
        action: "freight_updated",
      });
    }

    return res.status(200).json(updatedBatch);
  }

  if (req.method === "PATCH") {
    // Update committed/supplied volumes manually
    const { batchId, committedMT, suppliedMT, freightCost, freightCurrency, freightVendorName, freightInvoiceRef, freightNotes } = req.body;

    if (!batchId) {
      return res.status(400).json({ error: "batchId is required" });
    }

    const updateData = {};
    if (committedMT !== undefined) {
      updateData.committedMT = Number(committedMT);
    }
    if (suppliedMT !== undefined) {
      updateData.suppliedMT = Number(suppliedMT);
    }
    if (freightCost !== undefined) {
      const n = freightCost === "" || freightCost == null ? null : Number(freightCost);
      if (n != null && (Number.isNaN(n) || n < 0)) {
        return res.status(400).json({ error: "freightCost must be a number >= 0" });
      }
      updateData.freightCost = n;
      updateData.freightCurrency = freightCurrency ? String(freightCurrency) : "INR";
      updateData.freightVendorName = freightVendorName ? String(freightVendorName) : null;
      updateData.freightInvoiceRef = freightInvoiceRef ? String(freightInvoiceRef) : null;
      updateData.freightNotes = freightNotes ? String(freightNotes) : null;
      updateData.freightEnteredAt = new Date();
      updateData.freightEnteredBy = session.userId;
    }

    const updatedBatch = await prisma.orderBatch.update({
      where: { id: batchId },
      data: updateData,
      include: {
        order: {
          include: { org: true },
        },
        product: true,
        site: true,
      },
    });

    await logAudit({
      actorId: session.userId,
      req,
      entity: "orderBatch",
      entityId: batchId,
      action: "volume_updated",
    });

    if (freightCost !== undefined) {
      await logAudit({
        actorId: session.userId,
        req,
        entity: "orderBatch",
        entityId: batchId,
        action: "freight_updated",
      });
    }

    return res.status(200).json(updatedBatch);
  }

  return res.status(405).end();
}

export default requireAuth(requireRole(["OPS", "ADMIN"], handler));

