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
    const valid = ["NET_15", "NET_30", "NET_60", "NET_90"];
    allowed.defaultPaymentTerm = valid.includes(body.defaultPaymentTerm) ? body.defaultPaymentTerm : null;
  }
  const paymentModes = ["NET_TERMS", "ADVANCE_BALANCE", "PAY_BEFORE_DISPATCH", "STANDARD"];
  if (body.defaultPaymentMode !== undefined) {
    allowed.defaultPaymentMode = paymentModes.includes(body.defaultPaymentMode) ? body.defaultPaymentMode : null;
  }
  if (body.advancePercent !== undefined) {
    const v = body.advancePercent === "" ? null : Number(body.advancePercent);
    allowed.advancePercent = v != null && v >= 0 && v <= 100 ? v : undefined;
  }
  if (body.earlyPayDiscountPercent !== undefined) {
    const v = body.earlyPayDiscountPercent === "" ? null : Number(body.earlyPayDiscountPercent);
    allowed.earlyPayDiscountPercent = v != null && v >= 0 && v <= 100 ? v : undefined;
  }
  if (body.earlyPayDiscountDays !== undefined) {
    const v = body.earlyPayDiscountDays === "" ? null : Number(body.earlyPayDiscountDays);
    allowed.earlyPayDiscountDays = v != null && v >= 0 ? v : undefined;
  }
  if (body.retentionPercent !== undefined) {
    const v = body.retentionPercent === "" ? null : Number(body.retentionPercent);
    allowed.retentionPercent = v != null && v >= 0 && v <= 100 ? v : undefined;
  }
  if (body.retentionDays !== undefined) {
    const v = body.retentionDays === "" ? null : Number(body.retentionDays);
    allowed.retentionDays = v != null && v >= 0 ? v : undefined;
  }
  if (body.securityDepositAmount !== undefined) {
    const v = body.securityDepositAmount === "" ? null : Number(body.securityDepositAmount);
    allowed.securityDepositAmount = v != null && v >= 0 ? v : undefined;
  }
  if (body.creditLimit !== undefined) allowed.creditLimit = body.creditLimit == null || body.creditLimit === "" ? null : Number(body.creditLimit);
  if (typeof body.blockNewOrdersIfOverdue === "boolean") allowed.blockNewOrdersIfOverdue = body.blockNewOrdersIfOverdue;

  if (Object.keys(allowed).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
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
