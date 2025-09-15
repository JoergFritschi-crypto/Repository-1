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

// Try to check if database is actually working by importing db
let isDatabaseAvailable = true;
try {
  // Try to import db to see if database is configured
  require('./db');
} catch (error: any) {
  // If db.ts throws an error (database not configured), mark as unavailable
  isDatabaseAvailable = false;
  console.warn('⚠️ Database not configured for sessions, will use MemoryStore');
}

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
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
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days for better user experience
  
  let sessionStore: any;
  const databaseUrl = getDatabaseUrl();
  
  // Only try PostgreSQL if database is available AND we have a connection string
  if (isDatabaseAvailable && databaseUrl) {
    try {
      // Attempt to create PostgreSQL session store
      const pgStore = connectPg(session);
      sessionStore = new pgStore({
        conString: databaseUrl,
        createTableIfMissing: true,
        ttl: sessionTtl,
        tableName: "sessions",
        // Add error handler to prevent crashes
        errorLog: (error: any) => {
          // Check if this is a connection error
          if (error.message?.includes('endpoint has been disabled') ||
              error.message?.includes('connection refused') ||
              error.code === 'ECONNREFUSED') {
            console.error('⚠️ PGStore connection failed, sessions may be lost on restart:', error.message);
            // Mark database as unavailable for future requests
            isDatabaseAvailable = false;
          } else {
            console.error('PGStore error:', error);
          }
        }
      });
      console.log('✅ Using PostgreSQL for session storage');
    } catch (error: any) {
      console.warn('⚠️ Failed to create PostgreSQL session store:', error.message || error);
      console.warn('⚠️ Falling back to MemoryStore (sessions will not persist across restarts)');
      isDatabaseAvailable = false;
      const MemStore = MemoryStore(session);
      sessionStore = new MemStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      });
    }
  } else {
    // No database configured or database unavailable - use MemoryStore
    if (!isDatabaseAvailable) {
      console.warn('⚠️ Database unavailable - using MemoryStore for sessions');
    } else {
      console.warn('⚠️ No database configured - using MemoryStore for sessions');
    }
    console.warn('⚠️ Sessions will not persist across server restarts');
    const MemStore = MemoryStore(session);
    sessionStore = new MemStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiry on activity
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
      sameSite: 'lax', // Better CSRF protection
    },
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

async function upsertUser(
  claims: any,
  user: any
) {
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
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims(), user);
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Use the first domain if the hostname is not found (for local dev)
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    const strategyName = domains.includes(req.hostname) 
      ? `replitauth:${req.hostname}` 
      : `replitauth:${domains[0]}`;
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Use the first domain if the hostname is not found (for local dev)
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    const strategyName = domains.includes(req.hostname) 
      ? `replitauth:${req.hostname}` 
      : `replitauth:${domains[0]}`;
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
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
  const user = req.user as AuthUser;

  if (!req.isAuthenticated() || !user?.expires_at) {
    // Add hint for frontend to redirect
    return res.status(401).json({ 
      message: "Unauthorized", 
      hint: "session_expired" 
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ 
      message: "Unauthorized", 
      hint: "refresh_token_missing" 
    });
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    // Successfully refreshed - continue with request
    return next();
  } catch (error) {
    console.error("Token refresh failed:", error);
    return res.status(401).json({ 
      message: "Unauthorized", 
      hint: "refresh_failed" 
    });
  }
};
