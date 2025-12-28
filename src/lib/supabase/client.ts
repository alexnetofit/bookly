"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client during build time
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
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

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

