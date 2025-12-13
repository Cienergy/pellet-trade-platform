// pages/api/payment-proof.js
import formidable from 'formidable';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../../lib/supabaseServer';

export const config = { api: { bodyParser: false } };

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ error:'Method not allowed' });
  const form = formidable({ multiples:false });
  form.parse(req, async (err, fields, files) => {
    if(err) return res.status(400).json({ error:'Invalid form data' });
    const orderId = fields.orderId || fields.order_id || null;
    const file = files.file || files.paymentProof || Object.values(files)[0];
    if(!file) return res.status(400).json({ error:'file required' });
    const SUPABASE_OK = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    try {
      const buffer = fs.readFileSync(file.path);
      const filename = `${orderId || 'order'}_${uuidv4()}_${file.name || 'proof'}`;
      if(!SUPABASE_OK) return res.status(201).json({ status:'ok', filename, note:'no storage' });
      const bucket = 'payment-proofs';
      const { data, error: upErr } = await supabaseAdmin.storage.from(bucket).upload(filename, buffer, { contentType: file.type || 'application/octet-stream' });
      if(upErr) return res.status(500).json({ error:'Failed to upload file', details:upErr });
      await supabaseAdmin.from('payments').insert({ id: uuidv4(), order_id: orderId || null, amount: Number(fields.amount||0) || null, payment_mode: fields.paymentMode || null, storage_key: data.path || filename, status:'proof_uploaded', created_at: new Date().toISOString() }).catch(e=>console.warn('payments insert warn', e));
      return res.status(201).json({ status:'ok', path: data.path || filename });
    } catch(e){
      console.error('payment-proof handler error', e);
      return res.status(500).json({ error:'Internal server error' });
    }
  });
}
