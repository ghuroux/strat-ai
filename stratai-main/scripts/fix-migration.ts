import postgres from 'postgres';

async function main() {
  const sql = postgres('postgres://ghuroux@localhost:5432/stratai');
  
  // Remove the migration record so it can run again
  await sql`DELETE FROM schema_migrations WHERE version = '20260127_001_integrations_infrastructure'`;
  console.log('Removed migration record');
  
  await sql.end();
}

main().catch(console.error);
