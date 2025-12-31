"use client";

import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/database";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

interface UseUserReturn {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSubscriptionActive: boolean;
  refetch: () => Promise<void>;
}

// Cache em memória (persiste entre navegações, limpa no reload)
let profileCache: UserProfile | null = null;
let userCache: User | null = null;

export function useUser(): UseUserReturn {
  // Inicializa com cache em memória (útil para navegação entre páginas)
  const [user, setUser] = useState<User | null>(userCache);
  const [profile, setProfile] = useState<UserProfile | null>(profileCache);
  const [isLoading, setIsLoading] = useState(!profileCache);
  const [supabase] = useState(() => createClient());

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("users_profile")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data) {
      setProfile(data);
      profileCache = data; // Salva no cache em memória
    }
  };

  const refetch = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      userCache = currentUser;
      await fetchProfile(currentUser.id);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        userCache = session.user;
        fetchProfile(session.user.id);
      } else {
        // Limpa cache se não há sessão
        userCache = null;
        profileCache = null;
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
          userCache = session.user;
          fetchProfile(session.user.id);
        } else {
          userCache = null;
          profileCache = null;
          setUser(null);
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

  return { user, profile, isLoading, isSubscriptionActive, refetch };
}
