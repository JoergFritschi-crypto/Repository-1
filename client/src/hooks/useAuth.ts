import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

// Separate hook for tier testing to avoid conditional hook calls
export function useAuthWithTesting() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
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
  };
}
