import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROLE_PREFIX: Record<string, string> = {
  PATIENT: "/patient",
  DOCTOR: "/doctor",
  ADMIN: "/admin",
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPortalRoute = Object.values(ROLE_PREFIX).some((p) => path.startsWith(p));
  const isLoginPage = path === "/login";

  // 1. Unauthenticated users trying to access protected portals -> redirect to login
  if (isPortalRoute) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }

    // 2. Query user role from database / metadata
    let role = (user.app_metadata?.role || user.user_metadata?.role) as string | undefined;

    if (!role) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      role = dbUser?.role ?? "PATIENT";
    }

    const normalizedRole = role ? role.toUpperCase() : "PATIENT";
    const allowedPrefix = ROLE_PREFIX[normalizedRole] ?? "/patient";

    // 3. Block unauthorized cross-role access (e.g. patient accessing /doctor or /admin)
    if (!path.startsWith(allowedPrefix)) {
      return NextResponse.redirect(new URL(allowedPrefix, request.url));
    }
  }

  // 4. Authenticated users visiting /login -> redirect to their active portal
  if (isLoginPage && user) {
    let role = (user.app_metadata?.role || user.user_metadata?.role) as string | undefined;
    if (!role) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      role = dbUser?.role ?? "PATIENT";
    }
    const normalizedRole = role ? role.toUpperCase() : "PATIENT";
    const targetPortal = ROLE_PREFIX[normalizedRole] ?? "/patient";
    return NextResponse.redirect(new URL(targetPortal, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/patient/:path*", "/doctor/:path*", "/admin/:path*", "/login"],
};
