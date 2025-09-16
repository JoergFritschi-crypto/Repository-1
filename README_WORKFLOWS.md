# GitHub Workflows Documentation

This document explains the CI/CD workflows configured for GardenScape Pro.

## Workflows Overview

### 1. Database Tests (`database-tests.yml`)
- **Trigger**: On push to main/develop or PR to main when database/schema files change
- **Purpose**: Validates database migrations, RLS policies, and security functions
- **Tests**:
  - Runs all migrations in order
  - Verifies RLS is enabled on all tables
  - Checks for proper security function configuration
  - Validates no tables are missing policies
  - Runs database integrity tests

### 2. Supabase Migrations Check (`supabase-migrations.yml`)
- **Trigger**: On push to main/develop or PR to main when migrations change
- **Purpose**: Ensures migration quality and consistency
- **Checks**:
  - Migration naming convention (00001_description.sql)
  - Sequential ordering of migration numbers
  - SQL syntax validation
  - Security best practices (RLS, search_path)
  - Generates migration report

## How to Use

### Running Workflows Locally

#### Database Tests
```bash
# Install PostgreSQL client (Ubuntu/Debian)
sudo apt-get update && sudo apt-get install -y postgresql-client

# Run migrations against test database
for file in supabase/migrations/*.sql; do
  psql $DATABASE_URL -f "$file"
done

# Check RLS status
psql $DATABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

#### Migration Validation
```bash
# Check naming convention
for file in supabase/migrations/*.sql; do
  if ! [[ "$(basename $file)" =~ ^[0-9]{5}_[a-z_]+\.sql$ ]]; then
    echo "Error: $file doesn't follow naming convention"
  fi
done
```

### Creating New Migrations

1. **Name your migration properly**:
   ```
   supabase/migrations/00005_add_new_feature.sql
   ```

2. **Include security by default**:
   ```sql
   -- Enable RLS
   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
   
   -- Create secure functions
   CREATE FUNCTION my_function()
   RETURNS void AS $$
   BEGIN
     -- Function body
   END;
   $$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = '';
   ```

3. **Test locally before pushing**:
   ```bash
   psql $DATABASE_URL -f supabase/migrations/00005_add_new_feature.sql
   ```

## Repository Structure

```
.
├── .github/
│   └── workflows/
│       ├── database-tests.yml      # Database testing workflow
│       └── supabase-migrations.yml # Migration validation workflow
├── supabase/
│   ├── config.toml                 # Supabase configuration
│   └── migrations/                 # Database migrations
│       ├── 00001_initial_schema.sql
│       ├── 00002_create_functions.sql
│       ├── 00003_enable_rls_policies.sql
│       └── 00004_drop_unused_indexes.sql
├── scripts/
│   └── sql/
│       └── secure_functions.sql    # Secure function definitions
└── REPOSITORY_STRUCTURE.md          # Repository documentation
```

## Best Practices

### Security
- Always enable RLS on new tables
- Use `SECURITY DEFINER` with `SET search_path = ''` for functions
- Include `WITH CHECK` clauses in UPDATE policies
- Grant minimal necessary permissions

### Performance
- Create indexes for frequently queried columns
- Don't drop constraint-backed indexes
- Use `ANALYZE` after major schema changes
- Monitor query performance with `EXPLAIN`

### Migration Safety
- Never modify existing migrations
- Test migrations in a transaction first
- Include rollback procedures for complex changes
- Document breaking changes clearly

## Troubleshooting

### Common Issues

1. **Migration fails with "table already exists"**
   - Check if migration was partially applied
   - May need to manually clean up

2. **RLS policy not working**
   - Ensure RLS is enabled: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
   - Check policy conditions with `pg_policies` view

3. **Function security warning**
   - Add `SET search_path = ''` to function definition
   - Use fully qualified table names (e.g., `public.users`)

### Getting Help

- Check workflow logs in GitHub Actions tab
- Review migration artifacts in workflow runs
- Test locally with same PostgreSQL version (15)

## Next Steps

1. Set up GitHub secrets for production deployments
2. Add automated backup verification workflow
3. Implement database performance monitoring
4. Set up staging environment validation