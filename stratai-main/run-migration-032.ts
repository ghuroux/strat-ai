import { sql, closeConnection } from './src/lib/server/persistence/db';
import * as fs from 'fs';

async function runMigration() {
  const migrationPath = './src/lib/server/persistence/migrations/032-backfill-org-spaces.sql';
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('Running migration 032: Backfill Org Spaces...');
  
  try {
    await sql.unsafe(migrationSql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await closeConnection();
  }
}

runMigration().catch(console.error);
