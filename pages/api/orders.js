// pages/api/orders.js
import { v4 as uuidv4 } from "uuid";
import {
  getSupabase,
  supabaseActive,
  readLocalOrders,
  writeLocalOrders,
} from "./_supabase";

/*
 Robust orders API — uses your _supabase helpers when available.
 GET returns an array of orders with items/payments/totals.
 POST creates an order + batches (supabase if available, otherwise local fallback).
*/

function normalizeOrderRow(orderRow, batches = [], payments = []) {
  const items = (batches || [])
    .filter((b) => String(b.order_id) === String(orderRow.id || orderRow.order_id || orderRow.orderId))
    .map((b) => ({
      productId: b.product_id || b.productId || null,
      name: b.product_name || b.name || b.title || "Product",
      qty: Number(b.qty || b.quantity || 0),
      pricePerKg: Number(b.price_per_kg || b.pricePerKg || b.price || 0),
    }));

  const orderPayments = (payments || [])
    .filter((p) => String(p.order_id) === String(orderRow.id || orderRow.order_id || orderRow.orderId))
    .map((p) => ({
      id: p.id,
      amount: Number(p.amount || 0),
      mode: p.payment_mode || p.mode || "manual",
      receipt_url: p.receipt_url || p.receiptUrl || null,
      created_at: p.created_at || p.createdAt || null,
    }));

  const subtotal = items.reduce((s, it) => s + (it.qty * it.pricePerKg), 0);
  const paid = orderPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const outstanding = Math.max(0, subtotal - paid);

  return {
    ...orderRow,
    items,
    payments: orderPayments,
    totals: {
      subtotal,
      paid,
      outstanding,
      total: subtotal,
    },
  };
}

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";

    // GET — list orders
    if (method === "GET") {
      const supabase = getSupabase();
      const usingSupabase = supabaseActive();

      if (usingSupabase && supabase) {
        try {
          const [{ data: ordersRaw, error: ordersErr }, { data: batchesRaw, error: batchesErr }, { data: paymentsRaw, error: paymentsErr }] = await Promise.all([
            supabase.from("orders").select("*").order("created_at", { ascending: false }),
            supabase.from("order_batches").select("*"),
            supabase.from("payments").select("*"),
          ]);

          if (ordersErr) {
            console.error("GET /api/orders — ordersErr", ordersErr);
            return res.status(500).json({ error: "Failed to load orders" });
          }
          if (batchesErr) console.warn("GET /api/orders — batchesErr", batchesErr);
          if (paymentsErr) console.warn("GET /api/orders — paymentsErr", paymentsErr);

          const list = (ordersRaw || []).map((o) => normalizeOrderRow(o, batchesRaw || [], paymentsRaw || []));
          return res.status(200).json(list);
        } catch (e) {
          console.error("GET /api/orders — supabase query exception", e);
          // fall back below
        }
      }

      // Local fallback
      try {
        const local = await readLocalOrders();
        const raw = Array.isArray(local) ? local : (local.orders || []);
        const allBatches = local.batches || [];
        const allPayments = local.payments || [];
        const list = raw.map((o) => normalizeOrderRow(o, allBatches, allPayments));
        return res.status(200).json(list);
      } catch (e) {
        console.error("GET /api/orders — local fallback error", e);
        return res.status(500).json({ error: "Failed to load orders" });
      }
    }

    // POST — create order
    if (method === "POST") {
      const body = req.body || {};
      if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({ error: "Invalid payload: items array required" });
      }

      const supabase = getSupabase();
      const usingSupabase = supabaseActive();

      const orderId = uuidv4();
      const orderRow = {
        id: orderId,
        buyer_name: body.buyer?.name || body.buyerName || "Buyer",
        buyer_contact: body.buyer?.contact || body.buyerContact || "",
        region: body.transport?.deliveryRegion || body.region || null,
        transport_mode: body.transport?.transportMethod || (body.transport && body.transport.mode) || "truck",
        status: "created",
        created_at: new Date().toISOString(),
      };

      if (usingSupabase && supabase) {
        try {
          const { data: inserted, error: insertErr } = await supabase.from("orders").insert(orderRow).select().single();
          if (insertErr) {
            console.error("POST /api/orders — insert order error", insertErr);
            throw insertErr;
          }

          const batchRows = body.items.map((it) => ({
            id: uuidv4(),
            order_id: inserted.id,
            product_id: it.productId || null,
            product_name: it.name || null,
            qty: Number(it.qty || 0),
            price_per_kg: Number(it.pricePerKg || 0),
            created_at: new Date().toISOString(),
          }));

          if (batchRows.length) {
            const { error: batchErr } = await supabase.from("order_batches").insert(batchRows);
            if (batchErr) console.error("POST /api/orders — insert batches error", batchErr);
          }

          const normalized = normalizeOrderRow(inserted, batchRows, []);
          return res.status(201).json({ orderId: inserted.id, order: normalized });
        } catch (err) {
          console.warn("POST /api/orders — supabase path failed, falling back to local", err?.message || err);
        }
      }

      // Local fallback: persist using helper
      try {
        const local = await readLocalOrders()
        const obj = (typeof local === "object" && local !== null) ? local : { orders: [] }
        obj.orders = Array.isArray(obj.orders) ? obj.orders : []

        const orderForFile = {
          id: orderId,
          buyerName: orderRow.buyer_name,
          buyerContact: orderRow.buyer_contact,
          region: orderRow.region,
          transportMode: orderRow.transport_mode,
          status: orderRow.status,
          created_at: orderRow.created_at,
        }
        obj.orders.push(orderForFile)

        obj.batches = Array.isArray(obj.batches) ? obj.batches : []
        const batchRowsLocal = body.items.map((it) => ({
          id: uuidv4(),
          order_id: orderId,
          product_id: it.productId || null,
          product_name: it.name || null,
          qty: Number(it.qty || 0),
          price_per_kg: Number(it.pricePerKg || 0),
          created_at: new Date().toISOString(),
        }))
        obj.batches.push(...batchRowsLocal)

        obj.payments = Array.isArray(obj.payments) ? obj.payments : []

        await writeLocalOrders(obj)
        const normalized = normalizeOrderRow(orderForFile, batchRowsLocal, [])
        return res.status(201).json({ orderId, order: normalized })
      } catch (e) {
        console.error("POST /api/orders — local fallback write failed", e)
        return res.status(500).json({ error: "Failed to create order" })
      }
    }

    res.setHeader("Allow", ["GET","POST"])
    return res.status(405).json({ error: "Method not allowed" })
  } catch (err) {
    console.error("FATAL /api/orders ERROR", err)
    return res.status(500).json({ error: err?.message || "server error" })
  }
}
