import { Pool } from 'pg';

async function testSupabaseConnection() {
  const poolerUrl = process.env.SUPABASE_DATABASE_URL;
  
  if (!poolerUrl) {
    console.error('❌ SUPABASE_DATABASE_URL not found in environment');
    return false;
  }

  console.log('Testing Supabase connection...');
  console.log('URL includes pooler port 6543:', poolerUrl.includes('6543') ? '✓' : '✗');
  console.log('URL includes pgbouncer=true:', poolerUrl.includes('pgbouncer=true') ? '✓' : '✗');
  console.log('URL includes sslmode=require:', poolerUrl.includes('sslmode=require') ? '✓' : '✗');

  const pool = new Pool({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 0,
    query_timeout: 0,
    max: 1, // Minimal pool size for testing
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as ok');
    console.log('✅ Supabase pooler connection successful!', result.rows[0]);
    client.release();
    await pool.end();
    return true;
  } catch (error: any) {
    console.error('❌ Supabase connection failed:', error.message);
    console.error('Error code:', error.code);
    
    // Additional diagnostics
    if (error.code === 'ENOTFOUND') {
      console.error('DNS resolution failed. This is a network issue.');
      console.error('The Supabase host cannot be resolved from Replit environment.');
    }
    
    await pool.end();
    return false;
  }
}

// Export for use in other modules
export { testSupabaseConnection };

// Run test immediately
testSupabaseConnection().then(success => {
  process.exit(success ? 0 : 1);
});