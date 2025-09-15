# RLS Policies Verification Guide

This guide explains how to verify that the Row Level Security (RLS) policies are working correctly after applying the `missing_rls_policies.sql` script.

## Quick Application Steps

1. **Apply the policies to your Supabase database:**
   ```bash
   # Run the SQL script in your Supabase SQL editor or via CLI
   psql "postgresql://postgres:[password]@[host]:[port]/postgres" -f missing_rls_policies.sql
   ```

2. **Verify RLS is enabled on all tables:**
   ```sql
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN (
     'image_generation_queue', 
     'ip_access_control', 
     'plant_doctor_sessions', 
     'security_audit_logs', 
     'failed_login_attempts', 
     'active_sessions', 
     'rate_limit_violations', 
     'security_settings', 
     'security_recommendations'
   )
   ORDER BY tablename;
   ```

## Detailed Verification Tests

### 1. Image Generation Queue Policies

**Test User Access (Should Work):**
```sql
-- As authenticated user, should only see their own plant generation requests
SELECT * FROM image_generation_queue 
WHERE plant_id IN (
  SELECT p.id FROM plants p
  JOIN garden_plants gp ON p.id = gp.plant_id
  JOIN gardens g ON gp.garden_id = g.id
  WHERE g.user_id = auth.uid()
);
```

**Test Admin Access (Should Work):**
```sql
-- As admin, should see all generation queue items
SELECT COUNT(*) FROM image_generation_queue;
```

**Test Unauthorized Access (Should Fail):**
```sql
-- As non-admin user, should not see other users' generation requests
SELECT * FROM image_generation_queue WHERE plant_id NOT IN (
  SELECT p.id FROM plants p
  JOIN garden_plants gp ON p.id = gp.plant_id
  JOIN gardens g ON gp.garden_id = g.id
  WHERE g.user_id = auth.uid()
);
-- This should return no rows for non-admin users
```

### 2. IP Access Control Policies

**Test Admin Access (Should Work):**
```sql
-- As admin, should be able to manage IP controls
INSERT INTO ip_access_control (ip_address, control_type, reason)
VALUES ('192.168.1.100', 'block', 'Test entry');

SELECT * FROM ip_access_control;
```

**Test Non-Admin Access (Should Fail):**
```sql
-- As regular user, should not see or modify IP controls
SELECT * FROM ip_access_control;
-- This should return empty result set or access denied error
```

### 3. Plant Doctor Sessions Policies

**Test User CRUD Operations (Should Work):**
```sql
-- Insert own session
INSERT INTO plant_doctor_sessions (user_id, session_type, image_url)
VALUES (auth.uid(), 'identification', 'https://example.com/plant.jpg');

-- Read own sessions
SELECT * FROM plant_doctor_sessions WHERE user_id = auth.uid();

-- Update own session
UPDATE plant_doctor_sessions 
SET confidence = 0.95 
WHERE user_id = auth.uid() AND id = '[session_id]';

-- Delete own session
DELETE FROM plant_doctor_sessions 
WHERE user_id = auth.uid() AND id = '[session_id]';
```

**Test Anonymous Sessions (Should Work):**
```sql
-- Anonymous sessions should be accessible
INSERT INTO plant_doctor_sessions (user_id, session_type, image_url)
VALUES (NULL, 'identification', 'https://example.com/anonymous.jpg');

SELECT * FROM plant_doctor_sessions WHERE user_id IS NULL;
```

**Test Cross-User Access (Should Fail):**
```sql
-- Should not be able to access other users' sessions
SELECT * FROM plant_doctor_sessions WHERE user_id != auth.uid();
-- This should return empty result set
```

## Policy Verification Queries

### List All Policies
```sql
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
    'image_generation_queue', 
    'ip_access_control', 
    'plant_doctor_sessions', 
    'security_audit_logs', 
    'failed_login_attempts', 
    'active_sessions', 
    'rate_limit_violations', 
    'security_settings', 
    'security_recommendations'
)
ORDER BY tablename, policyname;
```

### Check RLS Status
```sql
SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN (
    'image_generation_queue', 
    'ip_access_control', 
    'plant_doctor_sessions'
)
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
```

## Security Testing Scenarios

### Scenario 1: Regular User Test
1. **Login as regular user** (not admin)
2. **Test plant_doctor_sessions**: Should be able to CRUD own sessions
3. **Test image_generation_queue**: Should only see their own generation requests  
4. **Test ip_access_control**: Should get empty results or access denied
5. **Test security tables**: Should only see their own audit logs, sessions, violations

### Scenario 2: Admin User Test
1. **Login as admin user** (is_admin = true)
2. **Test all tables**: Should have full access to all records
3. **Test policy override**: Admin policies should override user restrictions

### Scenario 3: Anonymous Access Test
1. **Test without authentication**: Should be denied on all tables
2. **Test plant_doctor_sessions**: Should work for anonymous sessions (user_id IS NULL)

## Expected Results Summary

| Table | Regular User Access | Admin Access | Anonymous Access |
|-------|-------------------|--------------|------------------|
| `image_generation_queue` | Own items only | All items | Denied |
| `ip_access_control` | Denied | Full access | Denied |
| `plant_doctor_sessions` | Own sessions + anonymous | All sessions | Only anonymous |
| `security_audit_logs` | Own events only | All events | Denied |
| `failed_login_attempts` | Denied | Full access | Denied |
| `active_sessions` | Own sessions only | All sessions | Denied |
| `rate_limit_violations` | Own violations only | All violations | Denied |
| `security_settings` | Denied | Full access | Denied |
| `security_recommendations` | Denied | Full access | Denied |

## Troubleshooting Common Issues

### Issue 1: "Permission Denied" Errors
- **Cause**: RLS is enabled but policies are too restrictive
- **Solution**: Check that the user has proper authentication and the policies include their use case

### Issue 2: Users Can See Other Users' Data
- **Cause**: Policies are too permissive or missing
- **Solution**: Review policy conditions, ensure proper user_id filtering

### Issue 3: Admin Users Can't Access Data
- **Cause**: Admin detection not working properly
- **Solution**: Verify `is_admin` field is set correctly in profiles table

### Issue 4: Anonymous Sessions Not Working
- **Cause**: Policies don't account for NULL user_id
- **Solution**: Ensure policies include `OR user_id IS NULL` where appropriate

## Policy Rollback

If you need to disable RLS temporarily for troubleshooting:

```sql
-- Disable RLS on specific table
ALTER TABLE public.image_generation_queue DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.image_generation_queue ENABLE ROW LEVEL SECURITY;
```

## Success Indicators

✅ **RLS Enabled**: All target tables show `rowsecurity = true`  
✅ **Policy Count**: Each table has appropriate number of policies  
✅ **User Isolation**: Users can only access their own data  
✅ **Admin Override**: Admin users can access all data  
✅ **Authentication Required**: Unauthenticated requests are denied  
✅ **Anonymous Support**: plant_doctor_sessions allows anonymous sessions  

## Security Compliance Check

After applying the policies, your Supabase security dashboard should show:
- ✅ **image_generation_queue**: RLS Enabled
- ✅ **ip_access_control**: RLS Enabled  
- ✅ **plant_doctor_sessions**: RLS Enabled (Complete)

All security-sensitive tables should now be properly protected with Row Level Security policies that enforce the principle of least privilege while maintaining application functionality.