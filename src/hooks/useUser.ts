"use client";

import { useAuth } from "@/components/providers/auth-provider";

export function useUser() {
  const { user, profile, isLoading, isSubscriptionActive, refetch } = useAuth();
  return { user, profile, isLoading, isSubscriptionActive, refetch };
}
