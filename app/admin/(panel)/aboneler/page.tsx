import { SubscribersManager } from "@/components/admin/SimpleManagers";
import { isMailConfigured } from "@/lib/email";
import { serviceClient } from "@/lib/supabase/admin";
import type { Subscriber } from "@/lib/types";

export default async function SubscribersPage() {
  const { data } = await serviceClient().from("subscribers").select("*").order("created_at", { ascending: false });
  return <SubscribersManager subscribers={(data ?? []) as Subscriber[]} emailReady={isMailConfigured()} />;
}
