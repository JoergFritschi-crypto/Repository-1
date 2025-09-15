import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error, isFetched } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }), // Return null on 401 instead of throwing
    retry: 1, // Allow one retry to handle network issues
    retryDelay: 1000, // Wait 1 second before retry
    // Always refetch on mount to get fresh auth state after OIDC redirect
    refetchOnMount: "always",
    // Refetch when window regains focus (after redirect)
    refetchOnWindowFocus: true,
    // Consider data stale after 5 minutes
    staleTime: 5 * 60 * 1000,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    // Use isFetched to track completion - true once the initial request completes
    authCheckComplete: isFetched,
  };
}

// Separate hook for tier testing to avoid conditional hook calls
export function useAuthWithTesting() {
  const { data: user, isLoading, error, isFetched } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }), // Return null on 401 instead of throwing
    retry: 1, // Allow one retry to handle network issues
    retryDelay: 1000, // Wait 1 second before retry
    // Always refetch on mount to get fresh auth state after OIDC redirect
    refetchOnMount: "always",
    // Refetch when window regains focus (after redirect)
    refetchOnWindowFocus: true,
    // Consider data stale after 5 minutes
    staleTime: 5 * 60 * 1000,
  });
  
  const [testingTier, setTestingTier] = useState<string | null>(null);
  
  // Check for tier testing mode
  useEffect(() => {
    const checkTestingMode = () => {
      const tier = sessionStorage.getItem('tierTestingMode');
      setTestingTier(tier);
    };
    
    // Check on mount and when storage changes
    checkTestingMode();
    window.addEventListener('storage', checkTestingMode);
    
    // Also check periodically for sessionStorage changes (storage event doesn't fire for same tab)
    const interval = setInterval(checkTestingMode, 500);
    
    return () => {
      window.removeEventListener('storage', checkTestingMode);
      clearInterval(interval);
    };
  }, []);
  
  // Create a modified user object with testing tier if applicable
  const effectiveUser = user && testingTier && user.isAdmin ? {
    ...user,
    userTier: testingTier as any,
    _testingMode: true,
    _actualTier: user.userTier  // Preserve actual tier
  } : user;

  return {
    user: effectiveUser,
    isLoading,
    isAuthenticated: !!user,
    isTestingMode: !!testingTier,
    testingTier,
    // Use isFetched to track completion - true once the initial request completes
    authCheckComplete: isFetched,
  };
}
