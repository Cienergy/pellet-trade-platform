// pages/api/upload-invoice.js
import { supabaseAdmin } from '../../lib/supabaseServer';

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ error:'Method not allowed' });
  const SUPABASE_OK = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { orderId, fileBase64, filename } = req.body || {};
  if(!fileBase64 || !filename || !orderId) return res.status(400).json({ error:'orderId, filename and fileBase64 required' });
  if(!SUPABASE_OK) return res.status(201).json({ status:'ok', note:'no storage' });
  try {
    const buf = Buffer.from(fileBase64, 'base64');
    const key = `invoices/${orderId}/${filename}`;
    const { data, error } = await supabaseAdmin.storage.from('invoices').upload(key, buf, { contentType:'application/pdf', upsert:true });
    if(error) return res.status(500).json({ error:'Failed to upload invoice', details:error });
    return res.status(201).json({ status:'ok', path: data.path });
  } catch(e){
    console.error('upload-invoice err', e);
    return res.status(500).json({ error:'Internal server error' });
  }
}
