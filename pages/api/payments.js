// pages/api/payments.js
import formidable from "formidable";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../../lib/supabaseServer";
import { generateInvoiceBuffer } from "../../lib/invoice";

export const config = { api: { bodyParser: false } };

/* helper: normalize a form field that may be an array or JSON string */
function normField(x) {
  if (Array.isArray(x)) return x[0];
  if (typeof x === "string") {
    // sometimes libraries send JSON encoded strings like '["id"]'
    try {
      const p = JSON.parse(x);
      if (Array.isArray(p)) return p[0];
      return p;
    } catch (e) {
      return x;
    }
  }
  return x;
}

/* wrapper to parse formidable forms as Promise */
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

/* Safe helper to create a signed URL if storage key exists */
async function createSignedUrl(bucket, path, expiresSec = 60 * 60) {
  try {
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresSec);
    if (error) return null;
    return data?.signedUrl || null;
  } catch (e) {
    return null;
  }
}

/* main handler */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // guard: supabaseAdmin
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase server client not configured" });

  try {
    const { fields, files } = await parseForm(req);

    // normalize fields
    const rawOrder = normField(fields.orderId || fields.order_id || fields.order);
    const orderId = rawOrder ? String(rawOrder).trim() : null;

    const rawAmount = normField(fields.amount);
    const amount = rawAmount !== undefined && rawAmount !== null ? Number(rawAmount) : NaN;

    const paymentMode = String(normField(fields.paymentMode || fields.mode || "manual") || "manual");
    const paymentType = String(normField(fields.paymentType || "full") || "full"); // full | deposit | installment
    const rawInstallment = normField(fields.installmentNo || fields.installment_no);
    const installmentNo = rawInstallment !== undefined && rawInstallment !== null && rawInstallment !== "" ? parseInt(rawInstallment, 10) : null;
    const rawBatch = normField(fields.batchId || fields.batch_id);
    const batchId = rawBatch ? String(rawBatch) : null;

    if (!orderId) return res.status(400).json({ error: "orderId required" });
    if (!amount || Number.isNaN(amount) || amount <= 0) return res.status(400).json({ error: "amount must be a positive number" });

    // create payment id
    const paymentId = uuidv4();
    let storageKey = null;

    // handle file upload if present (expects field name 'file')
    if (files && files.file) {
      try {
        const file = files.file;
        const buffer = fs.readFileSync(file.path);
        const filename = `receipts/receipts/${paymentId}.pdf`;
        const { error: uploadErr } = await supabaseAdmin.storage.from("receipts").upload(filename, buffer, {
          upsert: true,
          contentType: "application/pdf",
        });
        if (uploadErr) {
          console.error("Receipt upload failed:", uploadErr);
          // don't block - continue but leave storageKey null
        } else {
          storageKey = filename;
        }
      } catch (e) {
        console.error("Receipt processing error:", e);
      }
    }

    // prepare payment row
    const now = new Date().toISOString();
    const paymentRow = {
      id: paymentId,
      order_id: orderId,
      amount: Number(amount),
      payment_mode: paymentMode,
      status: "recorded",
      storage_key: storageKey,
      created_at: now,
    };
    if (installmentNo !== null && !Number.isNaN(installmentNo)) paymentRow.installment_no = installmentNo;
    if (batchId) paymentRow.batch_id = batchId;

    // insert row
    const { error: insertErr } = await supabaseAdmin.from("payments").insert(paymentRow);
    if (insertErr) {
      console.error("payments insert error", insertErr);
      return res.status(500).json({ error: "Failed to record payment", details: insertErr });
    }

    // Build signed receipt url if file uploaded
    let receiptUrl = null;
    if (storageKey) {
      receiptUrl = await createSignedUrl("receipts", storageKey, 60 * 60);
    }

    // Post-payment actions (best-effort)
    let invoiceUrl = null;
    try {
      if (paymentType === "installment" && installmentNo !== null) {
        // fetch relevant data for invoice (best-effort)
        const [{ data: batches }] = [await supabaseAdmin.from("order_batches").select("*").eq("order_id", orderId)];
        const [{ data: payments }] = [await supabaseAdmin.from("payments").select("*").eq("order_id", orderId)];
        const { data: orderData } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).limit(1);
        const ord = (orderData && orderData[0]) || { id: orderId, created_at: now, buyer_id: null, region: null, transport_mode: null };

        // generate invoice buffer - for now include all batches; if you track mapping of installments->batches you can filter here
        const buffer = await generateInvoiceBuffer(
          { id: ord.id, created_at: ord.created_at, buyer_name: ord.buyer_name || null, buyer_id: ord.buyer_id || null, region: ord.region, transport_mode: ord.transport_mode },
          batches || [],
          payments || []
        );

        const invoicePath = `invoices/invoices/${orderId}/installment_${installmentNo}_${paymentId}.pdf`;
        const { error: upErr } = await supabaseAdmin.storage.from("invoices").upload(invoicePath, buffer, {
          upsert: true,
          contentType: "application/pdf",
        });
        if (!upErr) {
          invoiceUrl = await createSignedUrl("invoices", invoicePath, 60 * 60);
        } else {
          console.error("installment invoice upload error", upErr);
        }

        // optionally update order_installments to mark paid (best-effort; only if such table exists and columns present)
        try {
          await supabaseAdmin
            .from("order_installments")
            .update({ /* optional: paid: true, paid_at: now, paid_amount: amount */ })
            .eq("order_id", orderId)
            .eq("installment_no", installmentNo);
        } catch (e) {
          // ignore - optional update
        }
      } else if (paymentType === "full" || paymentType === "deposit") {
        // optional: generate order-level receipt or invoice if needed
        // skip heavy ops here to keep API responsive
      }
    } catch (e) {
      console.error("post-payment follow-up error:", e);
      // not fatal - continue
    }

    // Respond with useful info
    return res.status(201).json({ paymentId, receiptUrl, invoiceUrl });
  } catch (err) {
    console.error("payments handler fatal error:", err);
    // Always send a response on unexpected failures
    return res.status(500).json({ error: "Unexpected server error", details: String(err) });
  }
}
