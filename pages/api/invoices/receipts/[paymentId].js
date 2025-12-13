import { supabase } from '../../../../lib/supabaseServer';

export default async function handler(req, res) {
  const { paymentId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!paymentId) {
    return res.status(400).json({ error: 'Missing paymentId' });
  }

  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_mode,
        created_at,
        order_id,
        receipt_url
      `)
      .eq('id', paymentId)
      .single();

    if (error) throw error;

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // If receipt already generated, just redirect
    if (payment.receipt_url) {
      return res.redirect(payment.receipt_url);
    }

    /**
     * For now: placeholder.
     * You already said generation works elsewhere.
     * This endpoint should NEVER crash build.
     */
    return res.status(200).json({
      message: 'Receipt generation handled elsewhere',
      paymentId: payment.id,
    });

  } catch (err) {
    console.error('Receipt API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
