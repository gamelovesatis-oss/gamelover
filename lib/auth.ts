import "server-only";
import { adminEmails, isSupabaseConfigured } from "@/lib/env";
import { sessionClient } from "@/lib/supabase/server";

/** Oturumdaki kullanıcı yöneticiyse e-postasını döndürür, değilse null. */
export async function getAdmin(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await sessionClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;
  return adminEmails.includes(email) ? email : null;
}

export async function requireAdmin(): Promise<string> {
  const email = await getAdmin();
  if (!email) throw new Error("Yetkisiz işlem.");
  return email;
}
