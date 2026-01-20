/**
 * StratAI Database Setup Script (Node.js/TypeScript version)
 *
 * Sets up PostgreSQL database with all schemas and migrations.
 * Compatible with PostgreSQL 13+ (tested on AWS RDS 17.7)
 *
 * Usage:
 *   npx tsx scripts/setup-db.ts
 *   DATABASE_URL="postgres://..." npx tsx scripts/setup-db.ts
 */

import postgres from 'postgres';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
	red: (s: string) => `\x1b[31m${s}\x1b[0m`,
	green: (s: string) => `\x1b[32m${s}\x1b[0m`,
	yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
	blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
	cyan: (s: string) => `\x1b[36m${s}\x1b[0m`
};

// Paths
const PROJECT_DIR = join(__dirname, '..');
const PERSISTENCE_DIR = join(PROJECT_DIR, 'src/lib/server/persistence');
const MIGRATIONS_DIR = join(PERSISTENCE_DIR, 'migrations');

// Get DATABASE_URL
function getDatabaseUrl(): string {
	// Check environment variable
	if (process.env.DATABASE_URL) {
		return process.env.DATABASE_URL;
	}

	// Try loading from .env file
	const envPath = join(PROJECT_DIR, '.env');
	if (existsSync(envPath)) {
		const envContent = readFileSync(envPath, 'utf-8');
		const match = envContent.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m);
		if (match) {
			return match[1];
		}
	}

	throw new Error(
		'DATABASE_URL not set. Please:\n' +
			'  1. Set DATABASE_URL environment variable, or\n' +
			'  2. Add DATABASE_URL to .env file\n\n' +
			'Example:\n' +
			"  DATABASE_URL='postgres://user:pass@host:5432/dbname?sslmode=require'"
	);
}

// Mask password in URL for logging
function maskUrl(url: string): string {
	return url.replace(/(:)[^:@]+(@)/, '$1****$2');
}

// Read SQL file
function readSqlFile(path: string): string | null {
	if (!existsSync(path)) {
		return null;
	}
	return readFileSync(path, 'utf-8');
}

// Main setup function
async function setupDatabase() {
	console.log(colors.blue('======================================'));
	console.log(colors.blue('  StratAI Database Setup Script'));
	console.log(colors.blue('======================================'));
	console.log('');

	// Get connection URL
	const databaseUrl = getDatabaseUrl();
	console.log(`Database: ${colors.green(maskUrl(databaseUrl))}`);
	console.log('');

	// Create connection
	const sql = postgres(databaseUrl, {
		max: 1,
		idle_timeout: 20,
		connect_timeout: 30
	});

	try {
		// Test connection
		console.log(colors.blue('Testing database connection...'));
		const versionResult = await sql`SELECT version()`;
		console.log(colors.green('Connection successful!'));
		console.log(`PostgreSQL version: ${colors.green(versionResult[0].version.split(',')[0])}`);
		console.log('');

		// Create migrations tracking table
		console.log(colors.blue('Setting up migrations tracking...'));
		await sql`
			CREATE TABLE IF NOT EXISTS schema_migrations (
				version VARCHAR(255) PRIMARY KEY,
				applied_at TIMESTAMPTZ DEFAULT NOW()
			)
		`;
		console.log(colors.green('Migrations tracking ready'));
		console.log('');

		// Run base schemas
		console.log(colors.blue('Running base schemas...'));
		const schemas = [
			{ file: 'schema.sql', desc: 'Core conversations schema' },
			{ file: 'spaces-schema.sql', desc: 'Spaces schema' },
			{ file: 'focus-areas-schema.sql', desc: 'Areas schema' },
			{ file: 'tasks-schema.sql', desc: 'Tasks schema' },
			{ file: 'documents-schema.sql', desc: 'Documents schema' },
			{ file: 'arena-schema.sql', desc: 'Arena battles schema' },
			{ file: 'tool-cache-schema.sql', desc: 'Tool cache schema' },
			{ file: 'organizations-schema.sql', desc: 'Organizations schema' },
			{ file: 'users-schema.sql', desc: 'Users schema' },
			{ file: 'org-memberships-schema.sql', desc: 'Organization memberships schema' },
			{ file: 'user-id-mappings-schema.sql', desc: 'User ID mappings schema' }
		];

		for (const schema of schemas) {
			const filePath = join(PERSISTENCE_DIR, schema.file);
			const content = readSqlFile(filePath);

			if (!content) {
				console.log(`  ${colors.yellow('Skipping')} (not found): ${schema.file}`);
				continue;
			}

			console.log(`  Running: ${colors.blue(schema.file)} - ${schema.desc}`);
			try {
				await sql.unsafe(content);
				console.log(`    ${colors.green('OK')}`);
			} catch (err: unknown) {
				const error = err as Error;
				// Ignore "already exists" errors
				if (error.message?.includes('already exists')) {
					console.log(`    ${colors.yellow('OK (already exists)')}`);
				} else {
					console.log(`    ${colors.yellow('Warning')}: ${error.message?.split('\n')[0]}`);
				}
			}
		}
		console.log('');

		// Run migrations
		console.log(colors.blue('Running migrations...'));

		if (!existsSync(MIGRATIONS_DIR)) {
			console.log(colors.yellow(`No migrations directory found at ${MIGRATIONS_DIR}`));
		} else {
			const migrationFiles = readdirSync(MIGRATIONS_DIR)
				.filter((f) => {
					// Only .sql files, ignore directories (like _v1-baseline)
					if (!f.endsWith('.sql')) return false;
					// Ignore any entries starting with _ (archive directories)
					if (f.startsWith('_')) return false;
					return true;
				})
				.sort((a, b) => {
					// Sort alphabetically - works for both old (0xx) and new (YYYYMMDD_NNN) naming
					// New format: 20260120_001_description.sql sorts chronologically by design
					return a.localeCompare(b);
				});

			for (const file of migrationFiles) {
				const migrationName = file.replace('.sql', '');

				// Check if already applied
				const applied = await sql`
					SELECT 1 FROM schema_migrations WHERE version = ${migrationName} LIMIT 1
				`;

				if (applied.length > 0) {
					console.log(`  ${colors.yellow('Skipping')}: ${migrationName} (already applied)`);
					continue;
				}

				console.log(`  ${colors.blue('Applying')}: ${migrationName}`);
				const filePath = join(MIGRATIONS_DIR, file);
				const content = readSqlFile(filePath);

				if (!content) continue;

				try {
					await sql.unsafe(content);
					await sql`INSERT INTO schema_migrations (version) VALUES (${migrationName}) ON CONFLICT DO NOTHING`;
					console.log(`    ${colors.green('OK')}`);
				} catch (err: unknown) {
					const error = err as Error;
					console.log(`    ${colors.yellow('Warning')}: ${error.message?.split('\n')[0]}`);
					// Still record migration to avoid re-running
					await sql`INSERT INTO schema_migrations (version) VALUES (${migrationName}) ON CONFLICT DO NOTHING`;
				}
			}
		}
		console.log('');

		// Verify setup
		console.log(colors.blue('Verifying database setup...'));
		console.log('');

		// List tables
		const tables = await sql`
			SELECT table_name
			FROM information_schema.tables
			WHERE table_schema = 'public'
			  AND table_type = 'BASE TABLE'
			ORDER BY table_name
		`;

		console.log('Tables created:');
		for (const row of tables) {
			console.log(`  ${colors.green('✓')} ${row.table_name}`);
		}
		console.log('');
		console.log(`Total tables: ${colors.green(String(tables.length))}`);
		console.log('');

		// Check extensions
		const extensions = await sql`
			SELECT extname, extversion FROM pg_extension WHERE extname != 'plpgsql'
		`;

		if (extensions.length > 0) {
			console.log('Extensions:');
			for (const ext of extensions) {
				console.log(`  ${colors.green('✓')} ${ext.extname} v${ext.extversion}`);
			}
			console.log('');
		}

		// Test UUID generation
		console.log('Testing UUID generation...');
		const uuidResult = await sql`SELECT gen_random_uuid() as uuid`;
		console.log(`  ${colors.green('✓')} gen_random_uuid() works: ${uuidResult[0].uuid}`);
		console.log('');

		// Summary
		console.log(colors.blue('======================================'));
		console.log(colors.green('  Database setup complete!'));
		console.log(colors.blue('======================================'));
		console.log('');
	} finally {
		await sql.end();
	}
}

// Run
setupDatabase().catch((err) => {
	console.error(colors.red(`Error: ${err.message}`));
	process.exit(1);
});
