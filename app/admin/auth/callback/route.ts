import { NextResponse } from "next/server";
import { sessionClient } from "@/lib/supabase/server";

/** E-posta ile gelen giriş bağlantısı buraya döner. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await sessionClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/admin", url.origin));
}
