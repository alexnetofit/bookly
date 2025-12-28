"use client";

import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/database";
import { useEffect, useState } from "react";
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

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("users_profile")
          .select("*")
          .eq("id", user.id)
          .single();
        
        setProfile(profile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          const { data: profile } = await supabase
            .from("users_profile")
            .select("*")
            .eq("id", session.user.id)
            .single();
          setProfile(profile);
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
  }, []);

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

