// pages/api/_supabase.js
import { createClient } from "@supabase/supabase-js";

let supabase = null;
let supabaseEnabled = false;

// Validate environment
const hasEnv =
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_URL.startsWith("http");

if (hasEnv) {
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );
    supabaseEnabled = true;
  } catch (err) {
    console.error("❌ Supabase initialization failed.", err.message);
    supabaseEnabled = false;
  }
} else {
  console.warn("⚠️ Supabase env vars missing — falling back to JSON mode.");
  supabaseEnabled = false;
}

export function getSupabase() {
  return supabaseEnabled ? supabase : null;
}

export function supabaseActive() {
  return supabaseEnabled;
}

// ----------------------------
// Local JSON fallback helpers
// ----------------------------
import fs from "fs-extra";
import path from "path";

const LOCAL_DB = path.join(process.cwd(), "orders.json");

export async function readLocalOrders() {
  await fs.ensureFile(LOCAL_DB);
  return fs.readJson(LOCAL_DB).catch(() => ({ orders: [] }));
}

export async function writeLocalOrders(data) {
  return fs.writeJson(LOCAL_DB, data, { spaces: 2 });
}
