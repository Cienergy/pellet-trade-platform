import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";
import { logAudit } from "../../../../lib/audit";

async function handler(req, res) {
  const { batchId } = req.query;
  const session = req.session;

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const batch = await prisma.orderBatch.findUnique({
      where: { id: batchId },
      include: {
        invoices: {
          include: { payments: true },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const invoices = batch.invoices || [];
    const advanceInvoices = invoices.filter((inv) => inv.invoiceType === "ADVANCE");

    let canStart = false;
    if (advanceInvoices.length > 0) {
      const advanceRequired = advanceInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
      const advancePaid = advanceInvoices.reduce((sum, inv) => {
        const paid = (inv.payments || []).filter((p) => p.verified).reduce((s, p) => s + p.amount, 0);
        return sum + paid;
      }, 0);
      canStart = advancePaid >= advanceRequired;
    } else {
      canStart = invoices.some((inv) =>
        (inv.payments || []).some((p) => p.verified === true)
      );
    }

    if (!canStart) {
      return res.status(400).json({
        error: advanceInvoices.length > 0
          ? "Cannot start processing. Advance payment must be fully approved first."
          : "Cannot start processing. Payment must be approved first.",
      });
    }

    const updatedBatch = await prisma.orderBatch.update({
      where: { id: batchId },
      data: { status: "IN_PROGRESS" },
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
      entityId: batchId,
      action: "started_processing",
    });

    return res.status(200).json(updatedBatch);
  } catch (err) {
    console.error("START BATCH ERROR:", err);
    return res.status(500).json({ error: err.message || "Failed to start batch" });
  }
}

export default requireAuth(requireRole(["ADMIN", "OPS"], handler));

