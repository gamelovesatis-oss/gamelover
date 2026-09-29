import "server-only";
import { getCampaigns, getEvents, getProducts } from "@/lib/data";
import { ADMIN_NOTIFY, digestHtml, mailLayout, sendBulk, sendMail } from "@/lib/email";
import { SITE_URL } from "@/lib/env";
import { signEmail } from "@/lib/social";
import { serviceClient } from "@/lib/supabase/admin";
import { tl } from "@/lib/utils";

/** Abonelere fırsat bülteni gönderir; istenirse yöneticiye haftalık rapor da yollar. */
export async function sendDigest(opts: { includeAdminReport?: boolean; subject?: string; intro?: string } = {}) {
  const db = serviceClient();
  const [campaigns, featured, events, subsRes] = await Promise.all([
    getCampaigns(true),
    getProducts({ featured: true }),
    getEvents(),
    db.from("subscribers").select("email").eq("active", true),
  ]);
  const recipients = (subsRes.data ?? []).map((s) => s.email as string);

  const sigs = new Map<string, string>();
  await Promise.all(recipients.map(async (e) => sigs.set(e, await signEmail(e))));

  const subject = opts.subject || "🔥 Çorum'un bu haftaki en büyük oyun fırsatları";
  const result = await sendBulk(recipients, subject, (email) =>
    digestHtml(
      campaigns.slice(0, 4),
      featured.slice(0, 4),
      events.slice(0, 3),
      `${SITE_URL}/api/newsletter?e=${encodeURIComponent(email)}&s=${sigs.get(email)}`,
      opts.intro,
    ),
  );

  if (opts.includeAdminReport && ADMIN_NOTIFY) {
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const [orders, offers, newSubs] = await Promise.all([
      db.from("orders").select("total,status").gte("created_at", since),
      db.from("offers").select("id").gte("created_at", since),
      db.from("subscribers").select("id").gte("created_at", since),
    ]);
    const valid = (orders.data ?? []).filter((o) => o.status !== "iptal");
    const revenue = valid.reduce((s, o) => s + Number(o.total), 0);
    await sendMail({
      to: ADMIN_NOTIFY,
      subject: `📊 Haftalık rapor — ${valid.length} sipariş, ${tl(revenue)}`,
      html: mailLayout(
        "Haftalık özet",
        `<table width="100%" cellpadding="10" style="text-align:center">
          <tr>
            <td style="background:#1c1836;border-radius:12px"><div style="font-size:28px;font-weight:800;color:#22d3ee">${valid.length}</div>Sipariş</td>
            <td style="background:#1c1836;border-radius:12px"><div style="font-size:28px;font-weight:800;color:#a3e635">${tl(revenue)}</div>Ciro</td>
          </tr><tr>
            <td style="background:#1c1836;border-radius:12px"><div style="font-size:28px;font-weight:800;color:#f472b6">${offers.data?.length ?? 0}</div>Teklif talebi</td>
            <td style="background:#1c1836;border-radius:12px"><div style="font-size:28px;font-weight:800;color:#fbbf24">${newSubs.data?.length ?? 0}</div>Yeni abone</td>
          </tr></table>
          <p>Bültenin <b>${result.sent ?? 0}</b> aboneye gönderildi.</p>
          <p><a href="${SITE_URL}/admin" style="color:#22d3ee">Yönetim paneline git →</a></p>`,
      ),
    });
  }
  return { recipients: recipients.length, ...result };
}
