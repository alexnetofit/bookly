import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
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

  // IMPORTANT: Do NOT use getSession() here as per Supabase docs.
  // Use getUser() which validates the token with the server and refreshes if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Helper function to create redirect with cookies
  const createRedirect = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const redirectResponse = NextResponse.redirect(url);
    
    // Copy all cookies from supabaseResponse to redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    
    return redirectResponse;
  };

  // Define public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/cadastro", "/auth/callback", "/assinatura-expirada", "/esqueci-senha", "/redefinir-senha"];
  const isPublicRoute = publicRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith("/api/webhook")
  );

  // Redirect to login if not authenticated and not on a public route
  if (!user && !isPublicRoute) {
    return createRedirect("/login");
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
          return createRedirect("/assinatura-expirada");
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
      return createRedirect("/dashboard");
    }
  }

  return supabaseResponse;
}
