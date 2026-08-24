import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // 1. Fetch user role from database
      const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      let userRole = (dbUser?.role || data.user.app_metadata?.role || "PATIENT").toUpperCase();

      // Ensure user is created in database if trigger was delayed
      if (!dbUser) {
        await supabase.from("users").insert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split("@")[0],
          role: "PATIENT",
        }).select().single();
        userRole = "PATIENT";
      }

      const redirectPath = userRole === "ADMIN" ? "/admin" : userRole === "DOCTOR" ? "/doctor" : "/patient";
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
