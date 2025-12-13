import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';

/**
 * JSONValue type for postgres.js sql.json() calls
 * Matches the expected type for JSONB serialization
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JSONValue = any;

/**
 * PostgreSQL connection pool using postgres.js
 *
 * Features:
 * - Connection pooling (default 10 connections)
 * - Automatic reconnection
 * - Prepared statement caching
 * - JSONB support out of the box
 */
export const sql = postgres(DATABASE_URL, {
	// Connection pool settings
	max: 10, // Max connections (default 10)
	idle_timeout: 20, // Close idle connections after 20s
	connect_timeout: 10, // Connection timeout in seconds

	// Transform settings for consistent naming
	transform: {
		// to: JS camelCase → DB snake_case (for INSERT/UPDATE)
		// from: DB snake_case → JS camelCase (for SELECT results)
		column: {
			to: postgres.fromCamel,
			from: postgres.toCamel
		}
	},

	// Development: log queries
	debug: process.env.NODE_ENV === 'development' ? console.log : undefined
});

/**
 * Test database connection
 * Call this on app startup to verify connection
 */
export async function testConnection(): Promise<boolean> {
	try {
		const result = await sql`SELECT 1 as connected`;
		return result[0]?.connected === 1;
	} catch (error) {
		console.error('Database connection failed:', error);
		return false;
	}
}

/**
 * Gracefully close all connections
 * Call on app shutdown
 */
export async function closeConnection(): Promise<void> {
	await sql.end();
}
