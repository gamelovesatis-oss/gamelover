import { SettingsForm } from "@/components/admin/SettingsForm";
import { demoSettings } from "@/lib/demo";
import { serviceClient } from "@/lib/supabase/admin";
import type { Settings } from "@/lib/types";

export default async function SettingsPage() {
  const { data } = await serviceClient().from("settings").select("*").eq("id", 1).maybeSingle();
  return <SettingsForm settings={(data ?? { ...demoSettings, social_webhook_url: null }) as Settings} />;
}
