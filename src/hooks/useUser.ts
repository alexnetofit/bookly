"use client";

import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/database";
import { useEffect, useState, useCallback } from "react";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface UseUserReturn {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSubscriptionActive: boolean;
  refetch: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from("users_profile")
        .select("*")
        .eq("id", userId)
        .single();
      
      setProfile(profileData);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, [supabase]);

  const fetchUser = useCallback(async () => {
    try {
      // Use getUser() - more reliable, validates token with server
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error("Auth error:", error.message);
        setUser(null);
        setProfile(null);
        return;
      }

      if (currentUser) {
        setUser(currentUser);
        await fetchProfile(currentUser.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, fetchProfile]);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser, fetchProfile, supabase.auth]);

  const isSubscriptionActive = profile
    ? profile.is_admin ||
      (profile.subscription_expires_at
        ? new Date(profile.subscription_expires_at) > new Date()
        : false)
    : false;

  return {
    user,
    profile,
    isLoading,
    isSubscriptionActive,
    refetch: fetchUser,
  };
}
