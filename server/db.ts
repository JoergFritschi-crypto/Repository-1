import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Automatically construct DATABASE_URL from environment variables
function getDatabaseUrl(): string {
  console.log('Available environment variables:');
  console.log('SUPABASE_DATABASE_URL:', process.env.SUPABASE_DATABASE_URL ? 'Set' : 'Not set');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  
  // Priority 1: Check for Supabase database URL (user-configured)
  if (process.env.SUPABASE_DATABASE_URL) {
    console.log('✅ Using Supabase database');
    console.log('Supabase host:', new URL(process.env.SUPABASE_DATABASE_URL).hostname);
    process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
    return process.env.SUPABASE_DATABASE_URL;
  }
  
  // Removed Neon PG* variables check - now using Supabase exclusively
  
  // Priority 3: Fall back to DATABASE_URL if neither exists
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL environment variable');
    return process.env.DATABASE_URL;
  }
  
  throw new Error(
    "Database configuration not found. Either set SUPABASE_DATABASE_URL, DATABASE_URL, or provision a database.",
  );
}

const DATABASE_URL = getDatabaseUrl();

// Configure connection pool with proper settings for PostgreSQL
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  max: 10, // maximum number of connections in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // timeout for new connection attempts
  maxUses: 7500, // close (and replace) connection after this many uses
  allowExitOnIdle: false, // keep the pool alive
});

// Handle pool errors to prevent crashes
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
  // Don't throw here to prevent the application from crashing
});

export const db = drizzle(pool, { schema });