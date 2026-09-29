import { notFound } from "next/navigation";
import { ContentManager } from "@/components/admin/ContentManager";
import { TABLES } from "@/lib/adminConfig";
import { serviceClient } from "@/lib/supabase/admin";

export default async function ContentPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const cfg = TABLES[key];
  if (!cfg) notFound();
  const { data, error } = await serviceClient().from(cfg.table).select("*").order(cfg.order.column, { ascending: cfg.order.ascending });
  if (error) return <p className="text-red-400">Veri alınamadı: {error.message}. Şemayı (supabase/schema.sql) çalıştırdınız mı?</p>;
  return <ContentManager tableKey={key} rows={data ?? []} />;
}
