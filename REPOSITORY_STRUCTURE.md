# GardenScape Pro Repository Structure

This document describes the professional repository structure for the GardenScape Pro application with Supabase integration.

## 📁 Directory Structure

```
.
├── .github/
│   └── workflows/
│       ├── database-tests.yml         # Database migration and RLS tests
│       ├── lint-and-type-check.yml    # Code quality checks
│       └── supabase-migrations.yml    # Migration validation
│
├── supabase/
│   ├── migrations/
│   │   ├── 00001_initial_schema.sql   # Initial database schema
│   │   ├── 00002_secure_functions.sql # Security functions with search_path
│   │   ├── 00003_row_level_security.sql # RLS policies
│   │   └── 00004_drop_unused_indexes.sql # Performance optimization
│   ├── config.toml                    # Supabase project configuration
│   └── seed.sql                       # Development seed data
│
├── client/                             # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   └── App.tsx
│   └── index.html
│
├── server/                             # Backend Express server
│   ├── routes.ts
│   ├── storage.ts
│   └── index.ts
│
├── shared/                             # Shared types and schemas
│   └── schema.ts
│
├── scripts/
│   ├── migrate.js                     # Migration helper script
│   └── sql/                          # Original SQL scripts (archived)
│
├── .gitignore                         # Comprehensive exclusions
├── package.json                       # Dependencies and scripts
├── tsconfig.json                      # TypeScript configuration
├── vite.config.ts                     # Vite configuration
└── drizzle.config.ts                  # Drizzle ORM configuration
```

## 🚀 Migration Management

### Using the Migration Helper Script

```bash
# Create a new migration
node scripts/migrate.js new add_user_profiles

# Apply all migrations
DATABASE_URL=your_database_url node scripts/migrate.js up

# Check migration status
DATABASE_URL=your_database_url node scripts/migrate.js status

# Verify migrations
DATABASE_URL=your_database_url node scripts/migrate.js verify
```

### Recommended Package.json Scripts

Add these scripts to your package.json:

```json
{
  "scripts": {
    "migrate:new": "node scripts/migrate.js new",
    "migrate:up": "node scripts/migrate.js up",
    "migrate:status": "node scripts/migrate.js status",
    "migrate:verify": "node scripts/migrate.js verify",
    "db:generate": "drizzle-kit generate",
    "db:studio": "drizzle-kit studio",
    "test:db": "NODE_ENV=test tsx test/database.test.ts"
  }
}
```

## 🔒 Security Features

### Implemented Security Measures

1. **Row Level Security (RLS)**: All tables have RLS enabled with proper policies
2. **Secure Functions**: All functions use `SET search_path = ''` to prevent SQL injection
3. **Updated_at Triggers**: Automatic timestamp updates on all tables
4. **Application-Level Auth**: Node.js handles authentication with session-based security

### Security Files

- `supabase/migrations/00002_secure_functions.sql`: Security-hardened database functions
- `supabase/migrations/00003_row_level_security.sql`: Comprehensive RLS policies
- `.github/workflows/database-tests.yml`: Automated security testing

## 🔄 GitHub Actions Workflows

### Database Tests (`database-tests.yml`)
- Runs on push/PR for database-related changes
- Sets up PostgreSQL service
- Applies all migrations
- Tests RLS policies
- Checks for security vulnerabilities

### Lint and Type Check (`lint-and-type-check.yml`)
- TypeScript type checking
- Dependency security audit
- Large file detection
- SQL migration validation

### Supabase Migrations (`supabase-migrations.yml`)
- Migration naming convention checks
- Migration order validation
- SQL syntax validation
- Security pattern verification

## 📝 Migration Guidelines

### Creating New Migrations

1. Use sequential numbering: `00001_`, `00002_`, etc.
2. Use descriptive names: `add_user_profiles`, `create_garden_tables`
3. Include header comments with description and date
4. Always use `IF EXISTS` for DROP statements
5. Include proper permissions with GRANT statements

### Migration Template

```sql
-- =============================================================================
-- Migration: Description
-- Created: YYYY-MM-DD
-- =============================================================================

-- Your migration SQL here

-- Always include IF EXISTS for safety
DROP TABLE IF EXISTS example_table;

-- Create tables with proper constraints
CREATE TABLE IF NOT EXISTS public.example_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- columns...
);

-- Enable RLS
ALTER TABLE public.example_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "example_policy" ON public.example_table
    FOR ALL USING (condition)
    WITH CHECK (condition);

-- Grant permissions
GRANT ALL ON public.example_table TO authenticated;
```

## 🌱 Development Workflow

1. **Create Migration**: `node scripts/migrate.js new feature_name`
2. **Write SQL**: Edit the generated migration file
3. **Test Locally**: Apply migration to local database
4. **Commit**: Push changes to trigger CI/CD
5. **Review**: GitHub Actions validate the migration
6. **Deploy**: Apply to production after merge

## 📚 Additional Resources

- [Supabase Migrations Guide](https://supabase.com/docs/guides/database/migrations)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)

## ⚠️ Important Notes

1. **Never commit `.env` files** - Use environment variables in CI/CD
2. **Test migrations locally first** - Use a development database
3. **Back up before production migrations** - Always have a rollback plan
4. **Review security policies** - Ensure RLS policies are restrictive
5. **Monitor GitHub Actions** - Fix any failing tests immediately

## 🎯 Next Steps

1. Set up environment variables in GitHub Secrets:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`

2. Configure branch protection rules:
   - Require PR reviews
   - Require status checks to pass
   - Include administrators

3. Set up deployment pipeline:
   - Staging environment for testing
   - Production deployment after approval

This structure ensures professional development practices, security compliance, and smooth integration with Supabase cloud services.