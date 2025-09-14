import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handleUnauthorizedError, shouldAutoRedirect } from "./authUtils";
import { addCSRFHeader, invalidateCSRFToken } from "./csrf";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Auto-redirect on 401 if appropriate
    if (res.status === 401 && shouldAutoRedirect()) {
      handleUnauthorizedError(false);
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Add CSRF token for mutation requests
  let headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  // Add CSRF token for non-GET requests
  if (method !== 'GET' && method !== 'HEAD') {
    headers = await addCSRFHeader(headers);
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // If we get a 403 with CSRF error, invalidate token and retry once
  if (res.status === 403) {
    const text = await res.text();
    if (text.includes('csrf') || text.includes('CSRF')) {
      console.warn('CSRF token validation failed, retrying with new token');
      invalidateCSRFToken();
      
      // Retry with new token
      headers = data ? { "Content-Type": "application/json" } : {};
      headers = await addCSRFHeader(headers);
      
      const retryRes = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
      
      await throwIfResNotOk(retryRes);
      return retryRes;
    }
    // Re-create response for non-CSRF 403 errors
    const errorRes = new Response(text, {
      status: 403,
      statusText: res.statusText,
      headers: res.headers
    });
    await throwIfResNotOk(errorRes);
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
