import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;
let clientCreationCount = 0;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // #region agent log
  clientCreationCount++;
  fetch('http://127.0.0.1:7242/ingest/951d7bfd-a350-405b-b678-3eded31d3efc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:createClient',message:'createClient called',data:{hasUrl:!!supabaseUrl,hasKey:!!supabaseAnonKey,hasExistingClient:!!client,creationCount:clientCreationCount},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  if (!supabaseUrl || !supabaseAnonKey) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/951d7bfd-a350-405b-b678-3eded31d3efc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:mockClient',message:'Returning mock client - env vars missing',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    
    // Return a mock client during build time
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

  // Singleton pattern - reuse the same client instance
  if (client) {
    return client;
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
