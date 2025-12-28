"use client";

import { createBrowserClient } from "@supabase/ssr";

// Singleton - but only on client side
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // Check if we're in the browser
  if (typeof window === "undefined") {
    // Server-side: return a minimal mock that won't break SSR
    return createMockClient();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return createMockClient();
  }

  // Return existing client if available (singleton on client)
  if (browserClient) {
    return browserClient;
  }

  // Create the browser client - it automatically handles cookies
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

function createMockClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ error: { message: "Not configured" } }),
      signUp: async () => ({ error: { message: "Not configured" } }),
      signOut: async () => ({}),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
        order: () => ({
          limit: async () => ({ data: [], error: null }),
        }),
        gte: () => ({
          single: async () => ({ data: null, error: null }),
        }),
        or: () => ({
          order: async () => ({ data: [], error: null }),
        }),
        single: async () => ({ data: null, error: null }),
      }),
      insert: async () => ({ error: null }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
      delete: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  } as ReturnType<typeof createBrowserClient>;
}
