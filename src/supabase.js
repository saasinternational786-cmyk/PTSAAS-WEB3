import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL missing");
}

if (!supabaseKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY missing");
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

export default supabase;