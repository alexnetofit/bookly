import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/cadastro", "/auth/callback"];
  const isPublicRoute = publicRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith("/api/webhook")
  );

  if (!user && !isPublicRoute) {
    // No user and trying to access protected route, redirect to login
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
        // Subscription expired, redirect to expired page
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
}

