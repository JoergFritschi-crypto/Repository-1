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
// Special configuration for Supabase pooler connection
const isSupabase = process.env.SUPABASE_DATABASE_URL && DATABASE_URL.includes('supabase.co');
const poolConfig: any = {
  connectionString: DATABASE_URL,
  max: isSupabase ? 5 : 10, // Smaller pool for Supabase pooler
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
  allowExitOnIdle: false,
};

// Add SSL configuration for Supabase
if (isSupabase) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
  // For PgBouncer, disable prepared statements
  poolConfig.statement_timeout = 0;
  poolConfig.query_timeout = 0;
  poolConfig.application_name = 'gardenscape-pro';
}

export const pool = new Pool(poolConfig);

// Handle pool errors to prevent crashes
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
  // Don't throw here to prevent the application from crashing
});

export const db = drizzle(pool, { schema });