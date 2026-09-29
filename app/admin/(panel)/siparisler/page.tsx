import { OrdersManager } from "@/components/admin/OrdersManager";
import { serviceClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { data } = await serviceClient().from("orders").select("*").order("created_at", { ascending: false }).limit(500);
  return <OrdersManager orders={(data ?? []) as Order[]} initialQuery={q ?? ""} />;
}
