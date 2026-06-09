import { createClient } from "@supabase/supabase-js";

// Vercel backend functions use SUPABASE_URL. 
// We include VITE_ variants as a fallback just in case, 
// but ensure the production variables in Vercel are set correctly.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: Missing Supabase environment variables!");
  throw new Error("Missing Supabase environment variables!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;