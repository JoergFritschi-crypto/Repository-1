// CSRF token management utility

let cachedToken: string | null = null;

/**
 * Get the CSRF token from the cookie
 * @returns The CSRF token or empty string if not found
 */
export function getCSRFTokenFromCookie(): string {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }
  return '';
}

/**
 * Fetch CSRF token from the server
 * @returns Promise with the CSRF token
 */
export async function fetchCSRFToken(): Promise<string> {
  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error('Failed to fetch CSRF token');
      return '';
    }
    
    const data = await response.json();
    return data.csrfToken || '';
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return '';
  }
}

/**
 * Get the CSRF token, fetching from server if needed
 * @returns Promise with the CSRF token
 */
export async function getCSRFToken(): Promise<string> {
  // First try to get from cookie
  let token = getCSRFTokenFromCookie();
  
  // If not found in cookie, fetch from server
  if (!token) {
    token = await fetchCSRFToken();
  }
  
  cachedToken = token;
  return token;
}

/**
 * Add CSRF token to headers
 * @param headers Existing headers object
 * @returns Headers object with CSRF token added
 */
export async function addCSRFHeader(headers: HeadersInit = {}): Promise<HeadersInit> {
  const token = await getCSRFToken();
  
  if (token) {
    return {
      ...headers,
      'X-CSRF-Token': token
    };
  }
  
  return headers;
}

/**
 * Invalidate cached CSRF token
 */
export function invalidateCSRFToken(): void {
  cachedToken = null;
}