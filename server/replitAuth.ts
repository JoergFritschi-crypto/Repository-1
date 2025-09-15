import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import type { AuthenticatedRequest, AuthUser } from './types/auth';

// Remove the problematic database availability check
// Let the actual session store creation determine if database is available

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    const issuerUrl = process.env.ISSUER_URL ?? "https://replit.com/oidc";
    console.log('🔐 [AUTH] OIDC Discovery - Issuer URL:', issuerUrl);
    console.log('🔐 [AUTH] OIDC Discovery - REPL_ID:', process.env.REPL_ID);
    
    try {
      const config = await client.discovery(
        new URL(issuerUrl),
        process.env.REPL_ID!
      );
      console.log('🔐 [AUTH] OIDC Discovery successful');
      console.log('🔐 [AUTH] Authorization endpoint:', config.authorization_endpoint);
      console.log('🔐 [AUTH] Token endpoint:', config.token_endpoint);
      return config;
    } catch (error) {
      console.error('❌ [AUTH] OIDC Discovery failed:', error);
      throw error;
    }
  },
  { maxAge: 3600 * 1000 }
);

// Get database URL from environment variables
function getDatabaseUrl(): string | null {
  // Priority: Use Supabase if configured
  if (process.env.SUPABASE_DATABASE_URL) {
    return process.env.SUPABASE_DATABASE_URL;
  }
  
  // Fall back to DATABASE_URL if Supabase not configured
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  return null;
}

// Create session middleware with appropriate store
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week (as per blueprint)
  
  // Always use MemoryStore for now due to Replit connection restrictions
  // This provides reliable session persistence during browser sessions
  console.log('🔐 [AUTH] Setting up session storage with optimized MemoryStore');
  console.log('⚠️ Sessions will not persist across server restarts (expected in Replit)');
  
  const MemStore = MemoryStore(session);
  const sessionStore = new MemStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiry on activity
    cookie: {
      httpOnly: true,
      // Optimize for Replit environment - no secure requirement in dev
      secure: false, // Allow session cookies in Replit development
      maxAge: sessionTtl,
      sameSite: 'lax', // Better CSRF protection
    },
    // Trust first proxy (required for Replit)
    proxy: true,
    name: 'gardenscape-session', // Custom session name for easier debugging
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any, user: any) {
  // Check if user is admin from OIDC claims
  const isAdmin = claims["is_admin"] === true || claims["role"] === "admin";
  
  const dbUser = await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    // Set isAdmin from OIDC claims
    isAdmin: isAdmin,
  });
  
  // Store the resolved database UUID on the user object
  user.databaseId = dbUser.id;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      console.log('🔐 [AUTH] Starting OIDC verification process');
      const claims = tokens.claims();
      console.log('🔐 [AUTH] OIDC claims received:', {
        sub: claims.sub,
        email: claims.email,
        first_name: claims.first_name,
        last_name: claims.last_name,
        is_admin: claims.is_admin,
        exp: claims.exp
      });

      const user = {};
      updateUserSession(user, tokens);
      console.log('🔐 [AUTH] User session updated with tokens');

      await upsertUser(claims, user);
      console.log('🔐 [AUTH] User upserted successfully, databaseId:', (user as any).databaseId);

      verified(null, user);
      console.log('🔐 [AUTH] Verification callback completed successfully');
    } catch (error) {
      console.error('❌ [AUTH] Error during OIDC verification:', error);
      verified(error, null);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const callbackURL = `https://${domain}/api/callback`;
    console.log('🔐 [AUTH] Registering strategy for domain:', domain);
    console.log('🔐 [AUTH] Callback URL:', callbackURL);
    
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL,
      },
      verify,
    );
    passport.use(strategy);
    console.log('🔐 [AUTH] Strategy registered:', `replitauth:${domain}`);
  }

  passport.serializeUser((user: Express.User, cb) => {
    console.log('🔐 [AUTH] Serializing user for session storage');
    cb(null, user);
  });
  
  passport.deserializeUser((user: Express.User, cb) => {
    // Only log once per session for cleaner logs
    const userId = (user as any)?.databaseId;
    if (userId && !passport.deserializeUser._logged) {
      console.log('🔐 [AUTH] User session restored:', userId);
      (passport.deserializeUser as any)._logged = true;
    }
    cb(null, user);
  });

  app.get("/api/login", (req, res, next) => {
    try {
      console.log('🔐 [AUTH] Login request initiated for:', req.hostname);
      
      // Use hostname-based strategy as per blueprint
      const strategyName = `replitauth:${req.hostname}`;
      console.log('🔐 [AUTH] Using strategy:', strategyName);
      
      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error) {
      console.error('❌ [AUTH] Error during login initiation:', error);
      res.status(500).json({ message: "Authentication initiation failed" });
    }
  });

  app.get("/api/callback", (req, res, next) => {
    try {
      console.log('🔐 [AUTH] Callback request received for:', req.hostname);
      
      if (req.query.error) {
        console.error('❌ [AUTH] OIDC error:', req.query.error, req.query.error_description);
        return res.redirect('/api/login?error=oidc_error');
      }
      
      // Use hostname-based strategy as per blueprint
      const strategyName = `replitauth:${req.hostname}`;
      console.log('🔐 [AUTH] Callback using strategy:', strategyName);
      
      passport.authenticate(strategyName, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    } catch (error) {
      console.error('❌ [AUTH] Critical error in callback handler:', error);
      res.redirect('/api/login?error=callback_error');
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    console.log('🔐 [AUTH] Checking authentication for:', req.originalUrl);
    console.log('🔐 [AUTH] Session ID:', req.sessionID);
    console.log('🔐 [AUTH] req.isAuthenticated():', req.isAuthenticated());
    console.log('🔐 [AUTH] req.user exists:', !!req.user);
    
    const user = req.user as AuthUser;
    console.log('🔐 [AUTH] User object:', {
      hasClaims: !!user?.claims,
      hasAccessToken: !!user?.access_token,
      hasRefreshToken: !!user?.refresh_token,
      expiresAt: user?.expires_at,
      databaseId: user?.databaseId
    });

    if (!req.isAuthenticated() || !user?.expires_at) {
      console.log('❌ [AUTH] Authentication failed:', {
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!user,
        hasExpiresAt: !!user?.expires_at
      });
      // Add hint for frontend to redirect
      return res.status(401).json({ 
        message: "Unauthorized", 
        hint: "session_expired" 
      });
    }

    const now = Math.floor(Date.now() / 1000);
    console.log('🔐 [AUTH] Token expiry check:', {
      now: now,
      expiresAt: user.expires_at,
      isValid: now <= user.expires_at
    });
    
    if (now <= user.expires_at) {
      console.log('✅ [AUTH] Token is valid, proceeding with request');
      return next();
    }

    console.log('⚠️ [AUTH] Token expired, attempting refresh');
    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      console.log('❌ [AUTH] No refresh token available');
      return res.status(401).json({ 
        message: "Unauthorized", 
        hint: "refresh_token_missing" 
      });
    }

    try {
      console.log('🔐 [AUTH] Attempting token refresh');
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      console.log('✅ [AUTH] Token refreshed successfully, continuing request');
      // Successfully refreshed - continue with request
      return next();
    } catch (error) {
      console.error("❌ [AUTH] Token refresh failed:", error);
      return res.status(401).json({ 
        message: "Unauthorized", 
        hint: "refresh_failed" 
      });
    }
  } catch (error) {
    console.error('❌ [AUTH] Critical error in isAuthenticated middleware:', error);
    return res.status(500).json({ 
      message: "Authentication check failed" 
    });
  }
};
