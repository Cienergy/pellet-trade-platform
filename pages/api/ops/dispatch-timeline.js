import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  const session = req.session;

  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const { orderId, batchId } = req.query;

  let batches;

  if (batchId) {
    // Get timeline for specific batch
    const batch = await prisma.orderBatch.findUnique({
      where: { id: batchId },
      include: {
        order: {
          include: { org: true },
        },
        product: true,
        site: true,
        invoices: true,
      },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    batches = [batch];
  } else if (orderId) {
    // Get timeline for all batches in an order
    batches = await prisma.orderBatch.findMany({
      where: { orderId },
      include: {
        order: {
          include: { org: true },
        },
        product: true,
        site: true,
        invoices: true,
      },
      orderBy: { createdAt: "asc" },
    });
  } else {
    // Get all batches with dispatch timelines
    batches = await prisma.orderBatch.findMany({
      include: {
        order: {
          include: { org: true },
        },
        product: true,
        site: true,
        invoices: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to recent batches
    });
  }

  // Calculate dispatch timelines and delivery performance
  const timelines = batches.map((batch) => {
    const timeline = {
      batchId: batch.id,
      orderId: batch.orderId,
      productName: batch.product.name,
      siteName: batch.site.name,
      buyerName: batch.order.org.name,
      quantityMT: batch.quantityMT,
      committedMT: batch.committedMT,
      suppliedMT: batch.suppliedMT,
      status: batch.status,
      events: [],
      performance: {},
    };

    // Build timeline events
    if (batch.createdAt) {
      timeline.events.push({
        type: "BATCH_CREATED",
        timestamp: batch.createdAt,
        label: "Batch Created",
      });
    }

    if (batch.leftFromSiteAt) {
      timeline.events.push({
        type: "LEFT_SITE",
        timestamp: batch.leftFromSiteAt,
        label: "Left Factory Site",
      });
    }

    if (batch.dispatchedAt) {
      timeline.events.push({
        type: "DISPATCHED",
        timestamp: batch.dispatchedAt,
        label: "Dispatched for Delivery",
        imageUrl: batch.dispatchImageUrl,
      });
    }

    if (batch.deliveryAt) {
      timeline.events.push({
        type: "SCHEDULED_DELIVERY",
        timestamp: batch.deliveryAt,
        label: "Scheduled Delivery",
      });
    }

    const firstInv = batch.invoices?.[0] || batch.invoice;
    if (firstInv?.createdAt) {
      timeline.events.push({
        type: "INVOICED",
        timestamp: firstInv.createdAt,
        label: "Invoice Generated",
      });
    }

    // Calculate delivery performance metrics
    if (batch.createdAt && batch.deliveryAt) {
      const createdDate = new Date(batch.createdAt);
      const deliveryDate = new Date(batch.deliveryAt);
      const daysToDelivery = Math.ceil((deliveryDate - createdDate) / (1000 * 60 * 60 * 24));
      
      timeline.performance.daysToDelivery = daysToDelivery;
      timeline.performance.onTime = batch.leftFromSiteAt 
        ? new Date(batch.leftFromSiteAt) <= deliveryDate 
        : null;
    }

    if (batch.leftFromSiteAt && batch.deliveryAt) {
      const leftDate = new Date(batch.leftFromSiteAt);
      const deliveryDate = new Date(batch.deliveryAt);
      const transitDays = Math.ceil((deliveryDate - leftDate) / (1000 * 60 * 60 * 24));
      timeline.performance.transitDays = transitDays;
    }

    // Sort events by timestamp
    timeline.events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return timeline;
  });

  return res.status(200).json(timelines);
}

export default requireAuth(requireRole(["OPS", "ADMIN", "FINANCE"], handler));

