import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { getAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Yönetim", robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return (
      <Center>
        <h1 className="font-display text-2xl font-bold text-white">Supabase bağlantısı gerekli</h1>
        <p className="mt-3 text-slate-400">
          Yönetim paneli için <code className="text-neon-cyan">NEXT_PUBLIC_SUPABASE_URL</code>, <code className="text-neon-cyan">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ve{" "}
          <code className="text-neon-cyan">SUPABASE_SERVICE_ROLE_KEY</code> ortam değişkenlerini tanımlayın. Kurulum adımları README.md dosyasında.
        </p>
        <Link href="/" className="btn-ghost mt-6">
          Siteye dön
        </Link>
      </Center>
    );

  const admin = await getAdmin();
  if (!admin)
    return (
      <Center>
        <h1 className="font-display text-2xl font-bold text-white">Yetkiniz yok</h1>
        <p className="mt-3 text-slate-400">
          Bu hesap yönetici listesinde değil. E-postanızı <code className="text-neon-cyan">ADMIN_EMAILS</code> ortam değişkenine ekleyin.
        </p>
        <AdminNav email={null} onlyLogout />
      </Center>
    );

  return (
    <div className="min-h-screen bg-ink-950 lg:grid lg:grid-cols-[260px_1fr]">
      <AdminNav email={admin} />
      <main className="min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 p-6">
      <div className="glass max-w-lg rounded-3xl p-8 text-center">{children}</div>
    </div>
  );
}
