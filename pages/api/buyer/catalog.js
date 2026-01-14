import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

export default requireAuth(
  requireRole("BUYER", async function handler(req, res) {
    try {
      const products = await prisma.product.findMany({
        where: { active: true },
        include: {
          inventories: {
            include: {
              site: true,
            },
          },
        },
      });

      const response = products.map((p) => {
        // Aggregate availableMT across all sites for this product
        const availableMT = p.inventories.reduce(
          (sum, inv) => sum + (inv.availableMT || 0),
          0
        );

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          pricePMT: p.pricePMT,
          availableMT: availableMT,
        };
      });

      return res.status(200).json(response);
    } catch (err) {
      console.error("CATALOG ERROR:", err);
      return res.status(500).json({ error: "Failed to load catalog" });
    }
  })
);
