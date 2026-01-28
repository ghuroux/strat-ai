import postgres from 'postgres';

async function main() {
  const sql = postgres('postgres://ghuroux@localhost:5432/stratai');
  
  const tables = await sql`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND (tablename LIKE '%integrat%' OR tablename = 'oauth_states')
    ORDER BY tablename
  `;
  console.log('Integration tables found:', tables.length);
  tables.forEach(t => console.log('  -', t.tablename));
  
  // Also check schema_migrations
  const migrations = await sql`
    SELECT version FROM schema_migrations 
    WHERE version LIKE '%integrations%'
  `;
  console.log('\nIntegration migrations recorded:', migrations.length);
  migrations.forEach(m => console.log('  -', m.version));
  
  await sql.end();
}

main().catch(console.error);
