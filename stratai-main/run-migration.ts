/**
 * Migration runner script
 * Usage: npx tsx run-migration.ts <migration-file>
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://ghuroux@localhost:5432/stratai';
const migrationFile = process.argv[2];

if (!migrationFile) {
	console.error('Usage: npx tsx run-migration.ts <migration-file>');
	process.exit(1);
}

async function runMigration() {
	const sql = postgres(DATABASE_URL);

	try {
		console.log(`Reading migration file: ${migrationFile}`);
		const migrationPath = resolve(migrationFile);
		const migrationSQL = readFileSync(migrationPath, 'utf-8');

		console.log('Running migration...');
		await sql.unsafe(migrationSQL);

		console.log('✓ Migration completed successfully');
	} catch (error) {
		console.error('✗ Migration failed:', error);
		process.exit(1);
	} finally {
		await sql.end();
	}
}

runMigration();
