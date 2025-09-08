export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// Auto-redirect to login on 401 with optional delay for toast notification
export function handleUnauthorizedError(showToast?: boolean): void {
  if (showToast) {
    // Give time for toast to show before redirect
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
  } else {
    // Immediate redirect
    window.location.href = "/api/login";
  }
}

// Check if we should auto-redirect (avoid infinite loops)
export function shouldAutoRedirect(): boolean {
  const path = window.location.pathname;
  // Don't redirect if already on login/callback paths or landing page
  return !path.startsWith('/api/login') && 
         !path.startsWith('/api/callback') && 
         path !== '/';
}