/**
 * Migration Runner Script
 *
 * Usage:
 *   npx tsx run-migration.ts                    # Run all pending migrations
 *   npx tsx run-migration.ts <migration-file>  # Run specific migration
 *   npx tsx run-migration.ts --status          # Show migration status
 *   npx tsx run-migration.ts --fix-tracking    # Record already-applied migrations
 *
 * Features:
 * - Tracks applied migrations in schema_migrations table
 * - Skips already applied migrations
 * - Runs migrations in version order
 * - Works with local PostgreSQL
 */

import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { resolve, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://ghuroux@localhost:5432/stratai';
const MIGRATIONS_DIR = resolve(__dirname, 'src/lib/server/persistence/migrations');

async function main() {
	// Suppress NOTICE messages for cleaner output
	const sql = postgres(DATABASE_URL, {
		onnotice: () => {} // Silence NOTICE messages
	});
	const arg = process.argv[2];

	try {
		// Ensure schema_migrations table exists
		await sql`
			CREATE TABLE IF NOT EXISTS schema_migrations (
				version TEXT PRIMARY KEY,
				applied_at TIMESTAMPTZ DEFAULT NOW()
			)
		`;

		if (arg === '--status') {
			await showStatus(sql);
		} else if (arg === '--fix-tracking') {
			await fixTracking(sql);
		} else if (arg) {
			await runSingleMigration(sql, arg);
		} else {
			await runPendingMigrations(sql);
		}
	} catch (error) {
		console.error('Error:', error);
		process.exit(1);
	} finally {
		await sql.end();
	}
}

/**
 * Show status of all migrations
 */
async function showStatus(sql: postgres.Sql) {
	const applied = await sql<{ version: string; applied_at: Date }[]>`
		SELECT version, applied_at FROM schema_migrations ORDER BY version
	`;
	const appliedVersions = new Set(applied.map(m => m.version));

	const allMigrations = getMigrationFiles();

	console.log('\nMigration Status:\n');
	console.log('  Applied  | Version');
	console.log('  ---------+' + '-'.repeat(50));

	for (const file of allMigrations) {
		const version = basename(file, '.sql');
		const isApplied = appliedVersions.has(version);
		const appliedAt = applied.find(m => m.version === version)?.applied_at;
		const status = isApplied ? '    ✓    ' : '    -    ';
		const dateStr = appliedAt ? ` (${appliedAt.toISOString().split('T')[0]})` : '';
		console.log(`  ${status} | ${version}${dateStr}`);
	}

	const pending = allMigrations.filter(f => !appliedVersions.has(basename(f, '.sql')));
	console.log(`\n  Total: ${allMigrations.length} | Applied: ${applied.length} | Pending: ${pending.length}\n`);
}

/**
 * Fix tracking for migrations that were applied but not recorded
 */
async function fixTracking(sql: postgres.Sql) {
	console.log('\nChecking for untracked migrations...\n');

	const applied = await sql<{ version: string }[]>`
		SELECT version FROM schema_migrations
	`;
	const appliedVersions = new Set(applied.map(m => m.version));

	// Migrations we know were applied based on schema state
	const knownApplied = [
		'027-area-sharing',
		'028-email-system',
		'029-page-sharing-audit'
	];

	let fixed = 0;
	for (const version of knownApplied) {
		if (!appliedVersions.has(version)) {
			await sql`
				INSERT INTO schema_migrations (version)
				VALUES (${version})
				ON CONFLICT (version) DO NOTHING
			`;
			console.log(`  ✓ Recorded: ${version}`);
			fixed++;
		}
	}

	if (fixed === 0) {
		console.log('  All migrations are properly tracked.');
	} else {
		console.log(`\n  Fixed tracking for ${fixed} migration(s).`);
	}
	console.log('');
}

/**
 * Run a single migration file
 */
async function runSingleMigration(sql: postgres.Sql, migrationFile: string) {
	const migrationPath = resolve(migrationFile);
	const version = basename(migrationFile, '.sql');

	// Check if already applied
	const [existing] = await sql`
		SELECT version FROM schema_migrations WHERE version = ${version}
	`;

	if (existing) {
		console.log(`\n  Migration ${version} already applied. Skipping.\n`);
		return;
	}

	console.log(`\nRunning migration: ${version}`);
	const migrationSQL = readFileSync(migrationPath, 'utf-8');

	await sql.begin(async (tx) => {
		await tx.unsafe(migrationSQL);
		await tx`
			INSERT INTO schema_migrations (version) VALUES (${version})
		`;
	});

	console.log(`  ✓ Migration ${version} completed successfully.\n`);
}

/**
 * Run all pending migrations in order
 */
async function runPendingMigrations(sql: postgres.Sql) {
	const applied = await sql<{ version: string }[]>`
		SELECT version FROM schema_migrations
	`;
	const appliedVersions = new Set(applied.map(m => m.version));

	const allMigrations = getMigrationFiles();
	const pending = allMigrations.filter(f => !appliedVersions.has(basename(f, '.sql')));

	if (pending.length === 0) {
		console.log('\n  All migrations are up to date.\n');
		return;
	}

	console.log(`\nRunning ${pending.length} pending migration(s):\n`);

	for (const file of pending) {
		const version = basename(file, '.sql');
		const migrationPath = resolve(MIGRATIONS_DIR, file);
		const migrationSQL = readFileSync(migrationPath, 'utf-8');

		process.stdout.write(`  Running ${version}...`);

		try {
			await sql.begin(async (tx) => {
				await tx.unsafe(migrationSQL);
				await tx`
					INSERT INTO schema_migrations (version) VALUES (${version})
				`;
			});
			console.log(' ✓');
		} catch (error) {
			console.log(' ✗');
			throw new Error(`Migration ${version} failed: ${error}`);
		}
	}

	console.log(`\n  ✓ All ${pending.length} migration(s) completed successfully.\n`);
}

/**
 * Get all migration files sorted by version
 */
function getMigrationFiles(): string[] {
	return readdirSync(MIGRATIONS_DIR)
		.filter(f => f.endsWith('.sql'))
		.sort((a, b) => {
			// Extract numeric prefix for proper sorting (e.g., "001-" before "002-")
			const numA = parseInt(a.split('-')[0], 10) || 0;
			const numB = parseInt(b.split('-')[0], 10) || 0;
			return numA - numB;
		});
}

main();
