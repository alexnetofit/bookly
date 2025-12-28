import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // If env vars are missing, just pass through
    if (!supabaseUrl || !supabaseAnonKey) {
      return supabaseResponse;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // Use getSession to leverage Supabase cookies without an extra fetch
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user || null;

    // Define public routes that don't require authentication
    const publicRoutes = ["/", "/login", "/cadastro", "/auth/callback", "/assinatura-expirada"];
    const isPublicRoute = publicRoutes.some(
      (route) =>
        request.nextUrl.pathname === route ||
        request.nextUrl.pathname.startsWith("/api/webhook")
    );

    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Check subscription status for protected routes (except admin routes)
    if (user && !isPublicRoute && !request.nextUrl.pathname.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("users_profile")
        .select("subscription_expires_at, is_admin")
        .eq("id", user.id)
        .single();

      if (profile && !profile.is_admin) {
        const expiresAt = profile.subscription_expires_at
          ? new Date(profile.subscription_expires_at)
          : null;
        const now = new Date();

        if (!expiresAt || expiresAt < now) {
          if (request.nextUrl.pathname !== "/assinatura-expirada") {
            const url = request.nextUrl.clone();
            url.pathname = "/assinatura-expirada";
            return NextResponse.redirect(url);
          }
        }
      }
    }

    // Check admin access
    if (user && request.nextUrl.pathname.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("users_profile")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Middleware error:", error);
    // On error, just pass through
    return NextResponse.next({ request });
  }
}
