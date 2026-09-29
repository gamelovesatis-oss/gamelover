import { NextResponse } from "next/server";
import { sendDigest } from "@/lib/digest";

/**
 * Vercel Cron her pazartesi 10:00'da (TR) çağırır — vercel.json.
 * Abonelere haftanın fırsatlarını, yöneticiye haftalık özet raporunu gönderir.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const result = await sendDigest({ includeAdminReport: true });
  return NextResponse.json(result);
}
