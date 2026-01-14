import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";
import { logAudit } from "../../../lib/audit";

async function handler(req, res) {
  const session = req.session;

  if (req.method === "GET") {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });

    return res.status(200).json(products);
  }

  if (req.method === "POST") {
    const {
      sku,
      name,
      type,
      grade,
      cvMin,
      cvMax,
      ashPct,
      moisture,
      pricePMT,
    } = req.body;

    if (!sku || !name || !pricePMT) {
      return res.status(400).json({
        error: "sku, name, and pricePMT are required",
      });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        type: type || "",
        grade: grade || "",
        cvMin: cvMin ? Number(cvMin) : 0,
        cvMax: cvMax ? Number(cvMax) : 0,
        ashPct: ashPct ? Number(ashPct) : 0,
        moisture: moisture ? Number(moisture) : 0,
        pricePMT: Number(pricePMT),
        active: true,
      },
    });

    await logAudit({
      actorId: session.userId,
      entity: "product",
      entityId: product.id,
      action: "created",
    });

    return res.status(201).json(product);
  }

  return res.status(405).end();
}

export default requireAuth(requireRole("ADMIN", handler));

