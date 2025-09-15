import type { Request } from 'express';

// OIDC Claims structure from Replit
export interface OIDCClaims {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  is_admin?: boolean;
  role?: string;
  exp?: number;
}

// User object attached to request by Passport
export interface AuthUser {
  claims: OIDCClaims;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  // Add the resolved database UUID
  databaseId?: string;
}

// Properly typed authenticated request
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  csrfToken?: () => string;
}

// Type guard to check if request is authenticated
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return req.user !== undefined && 
         'claims' in req.user && 
         'sub' in (req.user as any).claims;
}

// Helper to safely get user ID - returns the database UUID, not the Replit ID
export function getUserId(req: AuthenticatedRequest): string {
  // If we have the resolved database ID, use that
  if (req.user.databaseId) {
    return req.user.databaseId;
  }
  
  // Otherwise, fall back to claims.sub but log a warning
  const replitId = req.user.claims.sub;
  console.warn(`Using Replit ID as fallback: ${replitId} - database ID should be resolved during authentication`);
  
  return replitId;
}

// Helper to check if user is admin
export function isUserAdmin(req: AuthenticatedRequest): boolean {
  return req.user.claims.is_admin === true || req.user.claims.role === 'admin';
}