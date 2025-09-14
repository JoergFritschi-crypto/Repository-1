import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Type for CSRF-protected requests
export interface CSRFRequest extends Request {
  csrfToken?: () => string;
}

// Generate a secure CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Verify CSRF token using double-submit cookie pattern
export function verifyCSRFToken(request: Request): boolean {
  // Get token from header
  const headerToken = request.headers['x-csrf-token'] as string;
  if (!headerToken) {
    return false;
  }

  // Get token from cookie
  const cookieToken = request.cookies['csrf-token'];
  if (!cookieToken) {
    return false;
  }

  // Verify tokens match and are non-empty
  return headerToken === cookieToken && headerToken.length > 0;
}

// CSRF protection middleware for mutations (POST, PATCH, PUT, DELETE)
export function csrfProtection(req: CSRFRequest, res: Response, next: NextFunction) {
  // Skip CSRF check for GET and HEAD requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Skip CSRF check for specific endpoints (like Stripe webhooks)
  const skipPaths = [
    '/api/stripe-webhook',
    '/api/login',
    '/api/callback',
    '/api/logout'
  ];
  
  if (skipPaths.includes(req.path)) {
    return next();
  }

  // Verify CSRF token
  if (!verifyCSRFToken(req)) {
    return res.status(403).json({ 
      message: 'CSRF token validation failed',
      error: 'invalid_csrf_token'
    });
  }

  next();
}

// Middleware to ensure CSRF token exists
export function ensureCSRFToken(req: CSRFRequest, res: Response, next: NextFunction) {
  // Check if CSRF token exists in cookie
  if (!req.cookies['csrf-token']) {
    // Generate new token
    const token = generateCSRFToken();
    
    // Set token in cookie (httpOnly: false so frontend can read it)
    res.cookie('csrf-token', token, {
      httpOnly: false, // Frontend needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  // Add helper function to request
  req.csrfToken = () => req.cookies['csrf-token'] || '';

  next();
}

// Middleware specifically for admin routes
export function adminCSRFProtection(req: CSRFRequest, res: Response, next: NextFunction) {
  // Admin routes always require CSRF protection for mutations
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Verify CSRF token
  if (!verifyCSRFToken(req)) {
    console.warn(`CSRF token validation failed for admin route: ${req.path} from IP: ${req.ip}`);
    return res.status(403).json({ 
      message: 'CSRF token validation failed for admin action',
      error: 'invalid_csrf_token'
    });
  }

  next();
}