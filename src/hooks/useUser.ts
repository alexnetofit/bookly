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

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("users_profile")
      .select("*")
      .eq("id", userId)
      .single();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/951d7bfd-a350-405b-b678-3eded31d3efc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useUser.ts:fetchProfile',message:'Profile fetched',data:{userId,hasProfile:!!profileData,profileEmail:profileData?.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    
    setProfile(profileData);
  };

  const fetchUser = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/951d7bfd-a350-405b-b678-3eded31d3efc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useUser.ts:fetchUser:start',message:'fetchUser started',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    
    try {
      // First try to get session from local storage (faster)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/951d7bfd-a350-405b-b678-3eded31d3efc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useUser.ts:getSession',message:'getSession result',data:{hasSession:!!session,hasUser:!!session?.user,userId:session?.user?.id,sessionError:sessionError?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        // Fallback to server verification
        const { data: { user: serverUser }, error: userError } = await supabase.auth.getUser();
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/951d7bfd-a350-405b-b678-3eded31d3efc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useUser.ts:getUser',message:'getUser fallback result',data:{hasServerUser:!!serverUser,userId:serverUser?.id,userError:userError?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        
        setUser(serverUser);
        
        if (serverUser) {
          await fetchProfile(serverUser.id);
        } else {
          setProfile(null);
        }
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/951d7bfd-a350-405b-b678-3eded31d3efc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useUser.ts:catch',message:'Error in fetchUser',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      
      console.error("Error fetching user:", error);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/951d7bfd-a350-405b-b678-3eded31d3efc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useUser.ts:onAuthStateChange',message:'Auth state changed',data:{event,hasSession:!!session,userId:session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
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
