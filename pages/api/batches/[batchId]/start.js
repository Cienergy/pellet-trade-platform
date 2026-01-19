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
    // Check if batch has approved payment
    const batch = await prisma.orderBatch.findUnique({
      where: { id: batchId },
      include: {
        invoice: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    // Check if payment is approved
    const hasApprovedPayment = batch.invoice?.payments?.some(
      (p) => p.verified === true
    );

    if (!hasApprovedPayment) {
      return res.status(400).json({
        error: "Cannot start processing. Payment must be approved first.",
      });
    }

    // Update batch status to IN_PROGRESS
    const updatedBatch = await prisma.orderBatch.update({
      where: { id: batchId },
      data: { status: "IN_PROGRESS" },
      include: {
        product: true,
        site: true,
        invoice: true,
      },
    });

    await logAudit({
      actorId: session.userId,
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

