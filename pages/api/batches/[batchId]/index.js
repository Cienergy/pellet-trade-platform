import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";
import { logAudit } from "../../../../lib/audit";

async function handler(req, res) {
  const { batchId } = req.query;
  const session = req.session;

  if (req.method === "PATCH") {
    if (!batchId) {
      return res.status(400).json({ error: "Batch id is required" });
    }

    const body = req.body || {};
    const data = {};
    if (body.batchMargin !== undefined) data.batchMargin = body.batchMargin == null || body.batchMargin === "" ? null : Number(body.batchMargin);
    if (body.eWayBillNumber !== undefined) data.eWayBillNumber = body.eWayBillNumber || null;
    if (body.eWayBillDate !== undefined) data.eWayBillDate = body.eWayBillDate ? new Date(body.eWayBillDate) : null;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No valid fields to update (batchMargin, eWayBillNumber, eWayBillDate)" });
    }

    try {
      const batch = await prisma.orderBatch.update({
        where: { id: batchId },
        data,
      });

      await logAudit({
        actorId: session?.userId,
        entity: "batch",
        entityId: batch.id,
        action: "updated_margin_eway",
      });

      return res.status(200).json(batch);
    } catch (err) {
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Batch not found" });
      }
      console.error("Batch update error:", err);
      return res.status(500).json({ error: err.message || "Failed to update batch" });
    }
  }

  return res.status(405).end();
}

export default requireAuth(requireRole(["OPS", "ADMIN", "FINANCE"], handler));
