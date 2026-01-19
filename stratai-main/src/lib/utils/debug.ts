/**
 * Debug Utility
 *
 * Provides environment-gated logging functions for development debugging.
 * All output is suppressed in production builds for clean console output.
 */

import { dev } from '$app/environment';

/**
 * Log a debug message with category prefix (development only)
 *
 * @param category - Category or context for the log message (e.g., 'AUTH', 'CHAT', 'DB')
 * @param args - Values to log
 *
 * @example
 * debugLog('AUTH', 'User logged in:', userId);
 * // Output in dev: [AUTH] User logged in: 123
 * // Output in prod: (nothing)
 */
export function debugLog(category: string, ...args: unknown[]): void {
	if (dev) {
		console.log(`[${category}]`, ...args);
	}
}

/**
 * Log a debug warning with category prefix (development only)
 *
 * @param category - Category or context for the warning (e.g., 'AUTH', 'CHAT', 'DB')
 * @param args - Values to log
 *
 * @example
 * debugWarn('DB', 'Query took longer than expected:', duration);
 * // Output in dev: [DB] Query took longer than expected: 5000
 * // Output in prod: (nothing)
 */
export function debugWarn(category: string, ...args: unknown[]): void {
	if (dev) {
		console.warn(`[${category}]`, ...args);
	}
}
