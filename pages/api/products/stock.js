// pages/api/products/stock.js
export default async function handler(req, res) {
    if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });
  
    const { region, pelletType } = req.query;
  
    if (!region || !pelletType) {
      return res.status(400).json({ error: "region and pelletType required" });
    }
  
    // -------- DUMMY STOCK DATA (PROTOTYPE) --------
    const baseStock = {
      north: 120,
      south: 90,
      east: 65,
      west: 140,
      central: 110,
    };
  
    const adjustment = {
      "rice-husk": 1.0,
      "wood-chip": 0.8,
      "groundnut-shell": 0.6,
      "mixed": 1.2,
    };
  
    const available =
      Math.floor((baseStock[region] || 50) * (adjustment[pelletType] || 1));
  
    return res.status(200).json({
      available,
      updated_at: new Date().toISOString(),
      region,
      pelletType,
    });
  }
  