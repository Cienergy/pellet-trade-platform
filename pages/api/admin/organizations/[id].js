import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";
import { logAudit } from "../../../../lib/audit";

async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).end();

  const { id } = req.query;
  const session = req.session;

  if (!id) {
    return res.status(400).json({ error: "Organization id is required" });
  }

  const body = req.body || {};
  const allowed = {};
  if (body.buyerMargin !== undefined) allowed.buyerMargin = body.buyerMargin == null || body.buyerMargin === "" ? null : Number(body.buyerMargin);
  if (body.defaultPaymentTerm !== undefined) {
    const valid = ["NET_30", "NET_60", "NET_90"];
    allowed.defaultPaymentTerm = valid.includes(body.defaultPaymentTerm) ? body.defaultPaymentTerm : null;
  }
  if (body.creditLimit !== undefined) allowed.creditLimit = body.creditLimit == null || body.creditLimit === "" ? null : Number(body.creditLimit);

  if (Object.keys(allowed).length === 0) {
    return res.status(400).json({ error: "No valid fields to update (buyerMargin, defaultPaymentTerm, creditLimit)" });
  }

  try {
    const org = await prisma.organization.update({
      where: { id },
      data: allowed,
    });

    await logAudit({
      actorId: session?.userId,
      entity: "organization",
      entityId: org.id,
      action: "updated_margin_terms",
    });

    return res.status(200).json(org);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Organization not found" });
    }
    console.error("Organization update error:", err);
    return res.status(500).json({ error: err.message || "Failed to update organization" });
  }
}

export default requireAuth(requireRole("ADMIN", handler));
