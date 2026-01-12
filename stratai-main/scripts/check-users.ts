import postgres from 'postgres';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const match = envContent.match(/DATABASE_URL=(.+)/);
const DATABASE_URL = match?.[1];
if (!DATABASE_URL) process.exit(1);

const sql = postgres(DATABASE_URL);

async function check() {
  try {
    const users = await sql`SELECT id, username, display_name FROM users LIMIT 5`;
    console.log('Users:', users);
    
    if (users.length > 0) {
      console.log('\nFirst user ID:', users[0].id);
    } else {
      console.log('\nNo users found. Creating a test user...');
      // Create a test user
      const result = await sql`
        INSERT INTO users (id, username)
        VALUES ('00000000-0000-0000-0000-000000000099', 'test_guided_creation')
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `;
      console.log('Created user:', result);
    }
  } finally {
    await sql.end();
  }
}

check();
