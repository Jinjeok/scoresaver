import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message);
      return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("[auth/callback] user:", user?.email, "id:", user?.id);

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      console.log("[auth/callback] profile:", profile, "profileError:", profileError?.message);

      if (profile?.is_admin) {
        return NextResponse.redirect(`${origin}/admin/dashboard`);
      }
    }

    return NextResponse.redirect(origin);
  }

  console.error("[auth/callback] no code provided");
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
