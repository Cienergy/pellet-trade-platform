// pages/api/products.js
import { supabaseAdmin } from '../../lib/supabaseServer';

export default async function handler(req, res) {
  try {
    const SUPABASE_OK = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseAdmin);
    if (!SUPABASE_OK) {
      // Prototype fallback: return a small static list (keeps frontend working without DB)
      return res.status(200).json([
        {
          productId: '00000000-0000-0000-0000-000000000001',
          name: 'Napier Grass Pellets',
          feedstock: 'Napier',
          pricePerKg: 12.5,
          minOrderKg: 500,
          leadTimeDays: 0,
          stockByRegion: { north: 2500, east: 1200, west: 0, south: 0 },
        },
        {
          productId: '00000000-0000-0000-0000-000000000002',
          name: 'Groundnut Shell Pellets',
          feedstock: 'Groundnut shell',
          pricePerKg: 11.2,
          minOrderKg: 500,
          leadTimeDays: 3,
          stockByRegion: { north: 0, east: 800, west: 400, south: 0 },
        }
      ]);
    }

    // Fetch rows from products table
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, slug, name, feedstock, price_per_kg, min_order_kg, lead_time_days, stock_by_region, metadata')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('products fetch error', error);
      return res.status(500).json({ error });
    }

    // Normalize to frontend shape
    const products = (data || []).map(p => ({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      feedstock: p.feedstock,
      pricePerKg: Number(p.price_per_kg || 0),
      minOrderKg: Number(p.min_order_kg || 100),
      leadTimeDays: Number(p.lead_time_days || 7),
      stockByRegion: p.stock_by_region || {},
      metadata: p.metadata || {},
    }));

    return res.status(200).json(products);
  } catch (err) {
    console.error('GET /api/products error', err);
    return res.status(500).json({ error: err.message || err });
  }
}
