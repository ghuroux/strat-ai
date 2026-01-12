import postgres from 'postgres';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const match = envContent.match(/DATABASE_URL=(.+)/);
const DATABASE_URL = match?.[1];
if (!DATABASE_URL) process.exit(1);

const sql = postgres(DATABASE_URL);

async function check() {
  try {
    // Check constraint details
    const constraints = await sql`
      SELECT conname, contype, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'tasks'::regclass
    `;
    console.log('Tasks constraints:');
    for (const c of constraints) {
      console.log(`  ${c.conname}: ${c.def}`);
    }
    
    // Also check if users table exists and its columns
    const tables = await sql`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users'
    `;
    console.log('\nUsers table exists:', tables.length > 0);
    
    // Try a simple insert to see what error we get
    console.log('\nTrying test insert...');
    try {
      await sql`
        INSERT INTO tasks (id, title, status, priority, color, source_type, space_id, user_id, last_activity_at, created_at, updated_at)
        VALUES ('test_debug_123', 'Debug task', 'active', 'normal', '#6366f1', 'document', 'work', '00000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW())
      `;
      console.log('Insert succeeded!');
      await sql`DELETE FROM tasks WHERE id = 'test_debug_123'`;
    } catch (e: any) {
      console.log('Insert error:', e.message);
    }
  } finally {
    await sql.end();
  }
}

check();
