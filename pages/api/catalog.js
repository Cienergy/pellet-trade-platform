import { prisma } from "../../lib/prisma";
import requireAuth from "../../lib/requireAuth";

async function handler(req, res) {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      inventory: {
        include: {
          site: true,
        },
      },
    },
  });

  const result = products.map((p) => {
    const sites = p.inventory
      .filter((i) => i.availableMT > 0)
      .map((i) => ({
        siteId: i.siteId,
        siteName: i.site.name,
        availableMT: i.availableMT,
      }));

    return {
      id: p.id,
      name: p.name,
      grade: p.grade,
      pricePMT: p.pricePMT,
      available: sites.length > 0,
      sites,
    };
  });

  res.status(200).json(result);
}

export default requireAuth(handler);
