import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { status, startDate, endDate } = req.query;
  const session = req.session;

  const where = {};
  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      batch: {
        include: {
          product: true,
          order: {
            include: {
              org: true,
            },
          },
        },
      },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Convert to CSV
  const csv = [
    [
      "Invoice Number",
      "Date",
      "Organization",
      "Product",
      "Quantity (MT)",
      "Subtotal",
      "GST Rate",
      "GST Amount",
      "Total Amount",
      "Status",
      "Payments",
    ].join(","),
    ...invoices.map((inv) => {
      const payments = inv.payments
        .map((p) => `₹${p.amount} (${p.mode})`)
        .join("; ");
      return [
        inv.number,
        inv.createdAt.toISOString().split("T")[0],
        inv.batch.order.org.name,
        inv.batch.product.name,
        inv.batch.quantityMT,
        inv.subtotal,
        inv.gstRate,
        inv.gstAmount,
        inv.totalAmount,
        inv.status,
        payments || "None",
      ].join(",");
    }),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoices-${Date.now()}.csv"`
  );
  return res.status(200).send(csv);
}

export default requireAuth(requireRole("FINANCE", handler));

