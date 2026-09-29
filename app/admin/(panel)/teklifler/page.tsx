import { OffersManager } from "@/components/admin/SimpleManagers";
import { serviceClient } from "@/lib/supabase/admin";
import type { Offer } from "@/lib/types";

export default async function OffersPage() {
  const { data } = await serviceClient().from("offers").select("*").order("created_at", { ascending: false }).limit(500);
  return <OffersManager offers={(data ?? []) as Offer[]} />;
}
