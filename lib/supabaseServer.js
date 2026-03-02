// lib/supabaseServer.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = (url && key) ? createClient(url, key) : null;
/** Alias for backwards compatibility (e.g. receipts API). */
export const supabase = supabaseAdmin;
