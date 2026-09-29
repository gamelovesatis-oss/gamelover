import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/** Service role istemcisi — RLS'yi atlar. SADECE sunucuda kullanın. */
export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY tanımlı değil.");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}
