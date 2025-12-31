"use client";

import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/database";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, SupabaseClient } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSubscriptionActive: boolean;
  supabase: SupabaseClient;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("users_profile")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const refetch = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      await fetchProfile(currentUser.id);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const isSubscriptionActive = profile
    ? profile.is_admin ||
      (profile.subscription_expires_at
        ? new Date(profile.subscription_expires_at) > new Date()
        : false)
    : false;

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, isSubscriptionActive, supabase, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}




