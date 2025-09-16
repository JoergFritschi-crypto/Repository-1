#!/usr/bin/env node

/**
 * Migration helper script for Supabase
 * Usage: node scripts/migrate.js [command] [options]
 * 
 * Commands:
 *   new <name>    - Create a new migration file
 *   up            - Apply all pending migrations
 *   status        - Check migration status
 *   verify        - Verify all migrations are applied correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// Ensure migrations directory exists
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

const commands = {
  /**
   * Create a new migration file
   */
  new: (name) => {
    if (!name) {
      console.error('Error: Migration name is required');
      console.log('Usage: node scripts/migrate.js new <migration_name>');
      process.exit(1);
    }

    // Get next migration number
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    const nextNum = String((files.length + 1)).padStart(5, '0');
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const fileName = `${nextNum}_${safeName}.sql`;
    const filePath = path.join(MIGRATIONS_DIR, fileName);

    // Create migration template
    const template = `-- =============================================================================
-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- =============================================================================

-- Add your migration SQL here

`;

    fs.writeFileSync(filePath, template);
    console.log(`✅ Created migration: ${fileName}`);
    console.log(`   Path: ${filePath}`);
  },

  /**
   * Apply all pending migrations
   */
  up: () => {
    if (!process.env.DATABASE_URL) {
      console.error('Error: DATABASE_URL environment variable is not set');
      process.exit(1);
    }

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migrations to run');
      return;
    }

    console.log(`Found ${files.length} migration(s) to apply:\n`);

    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      console.log(`Running: ${file}...`);
      
      try {
        execSync(`psql ${process.env.DATABASE_URL} -f "${filePath}"`, {
          stdio: 'inherit'
        });
        console.log(`✅ Applied: ${file}\n`);
      } catch (error) {
        console.error(`❌ Failed to apply ${file}`);
        console.error(error.message);
        process.exit(1);
      }
    }

    console.log('✅ All migrations applied successfully!');
  },

  /**
   * Check migration status
   */
  status: () => {
    if (!process.env.DATABASE_URL) {
      console.error('Error: DATABASE_URL environment variable is not set');
      process.exit(1);
    }

    console.log('Checking database status...\n');

    // List migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Migration files (${files.length}):`);
    files.forEach(file => console.log(`  - ${file}`));

    console.log('\n---\n');

    // Check database tables
    try {
      console.log('Database tables:');
      execSync(
        `psql ${process.env.DATABASE_URL} -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"`,
        { stdio: 'inherit' }
      );
    } catch (error) {
      console.error('Failed to check database status');
      console.error(error.message);
    }
  },

  /**
   * Verify migrations are applied correctly
   */
  verify: () => {
    if (!process.env.DATABASE_URL) {
      console.error('Error: DATABASE_URL environment variable is not set');
      process.exit(1);
    }

    console.log('Verifying database migrations...\n');

    const checks = [
      {
        name: 'RLS Enabled',
        query: "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;"
      },
      {
        name: 'Functions with secure search_path',
        query: "SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosecdef = true AND proconfig IS NULL;"
      },
      {
        name: 'Tables with RLS policies',
        query: "SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;"
      }
    ];

    for (const check of checks) {
      console.log(`Checking: ${check.name}`);
      try {
        execSync(`psql ${process.env.DATABASE_URL} -c "${check.query}"`, {
          stdio: 'inherit'
        });
        console.log('---\n');
      } catch (error) {
        console.error(`Failed: ${check.name}`);
        console.error(error.message);
      }
    }
  }
};

// Parse command line arguments
const [,, command, ...args] = process.argv;

if (!command || !commands[command]) {
  console.log('Supabase Migration Helper\n');
  console.log('Usage: node scripts/migrate.js [command] [options]\n');
  console.log('Commands:');
  console.log('  new <name>    - Create a new migration file');
  console.log('  up            - Apply all pending migrations');
  console.log('  status        - Check migration status');
  console.log('  verify        - Verify all migrations are applied correctly');
  console.log('\nExample:');
  console.log('  node scripts/migrate.js new add_user_profiles');
  console.log('  node scripts/migrate.js up');
  process.exit(0);
}

// Execute command
commands[command](...args);