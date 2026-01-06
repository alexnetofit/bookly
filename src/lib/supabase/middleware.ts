import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Rotas que devem pular completamente o middleware (sem auth check)
  const skipAuthRoutes = ["/api/cron", "/api/webhook", "/api/stripe/webhook"];
  const shouldSkipAuth = skipAuthRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );
  
  if (shouldSkipAuth) {
    return supabaseResponse;
  }

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
  
  // Routes that require auth but should bypass subscription check
  const bypassSubscriptionRoutes = ["/planos", "/api/stripe"];
  
  const isPublicRoute = publicRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith("/api/webhook") ||
      request.nextUrl.pathname.startsWith("/api/stripe/webhook") ||
      request.nextUrl.pathname.startsWith("/api/cron")
  );
  
  const isBypassSubscriptionRoute = bypassSubscriptionRoutes.some(
    (route) => request.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if not authenticated and not on a public route
  if (!user && !isPublicRoute) {
    return createRedirect("/login");
  }

  // Check subscription status for protected routes (except admin routes and bypass routes)
  if (user && !isPublicRoute && !isBypassSubscriptionRoute && !request.nextUrl.pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("users_profile")
      .select("subscription_expires_at, is_admin, plan")
      .eq("id", user.id)
      .single();

    if (profile && !profile.is_admin) {
      // Planos pagos que precisam de verificação de expiração
      const paidPlans = ["explorer", "traveler", "devourer"];
      const isPaidPlan = paidPlans.includes(profile.plan || "");
      
      // Se for plano grátis (null, "free" ou inexistente), permitir acesso
      if (!isPaidPlan) {
        // Plano grátis - permitir acesso (limite de livros é controlado no app)
        return supabaseResponse;
      }
      
      // Se for plano pago, verificar expiração
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
