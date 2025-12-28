"use client";

import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/database";
import { useEffect, useState, useMemo } from "react";
import type { User } from "@supabase/supabase-js";

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

  // Create client once and reuse
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // First, try getSession for quick local read
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          
          // Fetch profile
          const { data: profileData } = await supabase
            .from("users_profile")
            .select("*")
            .eq("id", session.user.id)
            .single();
          
          setProfile(profileData);
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          
          // Fetch profile on sign in or token refresh
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
            const { data: profileData } = await supabase
              .from("users_profile")
              .select("*")
              .eq("id", session.user.id)
              .single();
            
            setProfile(profileData);
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
  }, [supabase]);

  const refetch = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (currentUser) {
      setUser(currentUser);
      
      const { data: profileData } = await supabase
        .from("users_profile")
        .select("*")
        .eq("id", currentUser.id)
        .single();
      
      setProfile(profileData);
    }
  };

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
    refetch,
  };
}
