import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Automatically construct DATABASE_URL from PG* environment variables if they exist
function getDatabaseUrl(): string {
  // Check if PG* variables exist (created by create_postgresql_database_tool)
  if (process.env.PGHOST && process.env.PGPORT && process.env.PGUSER && 
      process.env.PGPASSWORD && process.env.PGDATABASE) {
    // Construct DATABASE_URL from PG* variables
    const url = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
    console.log('Using PostgreSQL database from PG* environment variables');
    return url;
  }
  
  // Fall back to DATABASE_URL if PG* variables don't exist
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL environment variable');
    return process.env.DATABASE_URL;
  }
  
  throw new Error(
    "Database configuration not found. Either set DATABASE_URL or provision a database using create_postgresql_database_tool.",
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