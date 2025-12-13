// pages/api/production/batches.js
export default async function handler(req, res) {
    if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });
  
    const { region, type } = req.query;
  
    if (!region || !type) {
      return res.status(400).json({ error: "region and type required" });
    }
  
    // -------- DUMMY BATCH DATA (PROTOTYPE) --------
    const today = new Date();
  
    function daysFromNow(n) {
      const d = new Date();
      d.setDate(today.getDate() + n);
      return d.toISOString().slice(0, 10);
    }
  
    const batches = [
      {
        id: "batch-" + region + "-1",
        name: `${region.toUpperCase()}-${type}-B1`,
        qty: 25,
        eta: daysFromNow(3),
      },
      {
        id: "batch-" + region + "-2",
        name: `${region.toUpperCase()}-${type}-B2`,
        qty: 40,
        eta: daysFromNow(7),
      },
      {
        id: "batch-" + region + "-3",
        name: `${region.toUpperCase()}-${type}-B3`,
        qty: 30,
        eta: daysFromNow(12),
      },
    ];
  
    return res.status(200).json(batches);
  }
  