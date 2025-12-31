"use client";

import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/database";
import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";

const PROFILE_CACHE_KEY = "babel_profile_cache";
const USER_CACHE_KEY = "babel_user_cache";

interface UseUserReturn {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSubscriptionActive: boolean;
  refetch: () => Promise<void>;
}

// Helper para ler do cache
function getFromCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Helper para salvar no cache
function saveToCache(key: string, data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

// Helper para limpar cache
function clearCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
    sessionStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // Ignore errors
  }
}

export function useUser(): UseUserReturn {
  // Inicializar com dados do cache para carregamento instantâneo
  const [user, setUser] = useState<User | null>(() => getFromCache<User>(USER_CACHE_KEY));
  const [profile, setProfile] = useState<UserProfile | null>(() => getFromCache<UserProfile>(PROFILE_CACHE_KEY));
  const [isLoading, setIsLoading] = useState(!getFromCache(PROFILE_CACHE_KEY));
  const [supabase] = useState(() => createClient());

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("users_profile")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data) {
      setProfile(data);
      saveToCache(PROFILE_CACHE_KEY, data);
    }
    return data;
  }, [supabase]);

  const refetch = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      saveToCache(USER_CACHE_KEY, currentUser);
      await fetchProfile(currentUser.id);
    }
  }, [supabase, fetchProfile]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        saveToCache(USER_CACHE_KEY, session.user);
        await fetchProfile(session.user.id);
      } else {
        // Não há sessão, limpar cache
        clearCache();
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          clearCache();
          setUser(null);
          setProfile(null);
        } else if (session?.user) {
          setUser(session.user);
          saveToCache(USER_CACHE_KEY, session.user);
          await fetchProfile(session.user.id);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const isSubscriptionActive = profile
    ? profile.is_admin ||
      (profile.subscription_expires_at
        ? new Date(profile.subscription_expires_at) > new Date()
        : false)
    : false;

  return { user, profile, isLoading, isSubscriptionActive, refetch };
}
