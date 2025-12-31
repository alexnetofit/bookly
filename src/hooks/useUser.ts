"use client";

import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/database";
import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";

const PROFILE_CACHE_KEY = "babel_profile_cache";

interface UseUserReturn {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSubscriptionActive: boolean;
  refetch: () => Promise<void>;
}

// Helper para ler profile do cache (localStorage persiste entre sessões)
function getProfileFromCache(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as UserProfile;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Helper para salvar profile no cache
function saveProfileToCache(data: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

// Helper para limpar cache
function clearCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Ignore errors
  }
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [supabase] = useState(() => createClient());

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("users_profile")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data) {
      setProfile(data);
      saveProfileToCache(data);
    }
    return data;
  }, [supabase]);

  const refetch = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      await fetchProfile(currentUser.id);
    }
  }, [supabase, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      // Primeiro, tentar carregar do cache para UI instantânea
      const cachedProfile = getProfileFromCache();
      if (cachedProfile && isMounted) {
        setProfile(cachedProfile);
        setIsLoading(false);
      }

      // Verificar sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        // Buscar profile atualizado em background
        await fetchProfile(session.user.id);
      } else {
        // Não há sessão válida, limpar tudo
        clearCache();
        setUser(null);
        setProfile(null);
      }
      
      setIsLoading(false);
      setInitialized(true);
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === "SIGNED_OUT") {
          clearCache();
          setUser(null);
          setProfile(null);
        } else if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          setUser(session.user);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const isSubscriptionActive = profile
    ? profile.is_admin ||
      (profile.subscription_expires_at
        ? new Date(profile.subscription_expires_at) > new Date()
        : false)
    : false;

  return { user, profile, isLoading, isSubscriptionActive, refetch };
}
