import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { from, to, status } = req.query;
  const where = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: {
      org: true,
      requestedProduct: true,
      batches: {
        include: {
          product: true,
          site: true,
          invoice: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const rows = [
    [
      "Order ID",
      "Buyer",
      "State",
      "Status",
      "Requested MT",
      "Requested Product",
      "Batched MT",
      "Batches",
      "Created",
    ].join(","),
  ];

  for (const o of orders) {
    const batchedMT = o.batches?.reduce((s, b) => s + b.quantityMT, 0) || 0;
    rows.push(
      [
        o.id,
        `"${(o.org?.name || "").replace(/"/g, '""')}"`,
        o.org?.state || "",
        o.status,
        o.requestedQuantityMT ?? "",
        o.requestedProduct?.name ?? "",
        batchedMT.toFixed(2),
        o.batches?.length ?? 0,
        new Date(o.createdAt).toISOString().slice(0, 10),
      ].join(",")
    );
  }

  const csv = rows.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="orders-export-${Date.now()}.csv"`);
  return res.status(200).send(csv);
}

export default requireAuth(requireRole(["FINANCE", "ADMIN", "OPS"], handler));
