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

  // Helper function to escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value);
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Calculate invoice status for each invoice
  const invoicesWithStatus = invoices.map((invoice) => {
    const totalPaid = invoice.payments
      .filter(p => p.verified)
      .reduce((sum, p) => sum + p.amount, 0);
    const hasUnverifiedPayments = invoice.payments.some(p => !p.verified);
    const isFullyPaid = totalPaid >= invoice.totalAmount;
    
    let status = "PENDING";
    if (isFullyPaid && !hasUnverifiedPayments) {
      status = "PAID";
    } else if (hasUnverifiedPayments) {
      status = "PENDING_VERIFICATION";
    } else if (totalPaid > 0) {
      status = "PARTIAL";
    }

    return {
      ...invoice,
      calculatedStatus: status,
    };
  });

  // Convert to CSV
  const csv = [
    [
      "Invoice Number",
      "Order ID",
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
    ].map(escapeCSV).join(","),
    ...invoicesWithStatus.map((inv) => {
      const payments = inv.payments
        .map((p) => `INR ${p.amount.toLocaleString('en-IN')} (${p.mode})`)
        .join("; ");
      return [
        inv.number,
        inv.batch?.order?.id ? `#${inv.batch.order.id.slice(0, 8).toUpperCase()}` : "",
        inv.createdAt.toISOString().split("T")[0],
        inv.batch.order.org.name,
        inv.batch.product.name,
        inv.batch.quantityMT,
        `INR ${inv.subtotal.toLocaleString('en-IN')}`,
        `${inv.gstRate}%`,
        `INR ${inv.gstAmount.toLocaleString('en-IN')}`,
        `INR ${inv.totalAmount.toLocaleString('en-IN')}`,
        inv.calculatedStatus === "PENDING_VERIFICATION" ? "PENDING VERIFICATION" : (inv.calculatedStatus || "PENDING"),
        payments || "None",
      ].map(escapeCSV).join(",");
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

