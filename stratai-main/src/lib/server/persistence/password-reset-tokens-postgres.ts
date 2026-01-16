/**
 * Password Reset Token Repository
 *
 * Secure token management for password reset and welcome flows.
 * See: docs/SENDGRID_EMAIL_INTEGRATION.md
 */

import { createHash, randomBytes } from 'crypto';
import { sql } from './db';
import type { PasswordResetToken, TokenType } from '$lib/types/email';

/**
 * Token expiry times by type (in minutes)
 * - reset: 60 minutes (1 hour) for password reset
 * - welcome: 10080 minutes (7 days) for new user welcome emails
 */
const TOKEN_EXPIRY_MINUTES: Record<TokenType, number> = {
	reset: 60,
	welcome: 10080
};

/**
 * Hash token using SHA256
 * Only hashes are stored in database
 */
function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

interface PasswordResetTokenRow {
	id: string;
	userId: string;
	tokenHash: string;
	tokenType: TokenType;
	expiresAt: Date;
	usedAt: Date | null;
	createdAt: Date;
}

/**
 * Convert database row to PasswordResetToken entity
 */
function rowToToken(row: PasswordResetTokenRow): PasswordResetToken {
	return {
		id: row.id,
		userId: row.userId,
		tokenHash: row.tokenHash,
		tokenType: row.tokenType,
		expiresAt: row.expiresAt,
		usedAt: row.usedAt,
		createdAt: row.createdAt
	};
}

export const postgresPasswordResetTokenRepository = {
	/**
	 * Create a new password reset token
	 * Returns the plain token (to send in email) - we only store the hash
	 *
	 * @param userId - The user ID to create the token for
	 * @param tokenType - The token type: 'reset' (1 hour) or 'welcome' (7 days). Defaults to 'reset'.
	 */
	async create(userId: string, tokenType: TokenType = 'reset'): Promise<string> {
		// Invalidate any existing tokens for this user of the same type
		await sql`
			UPDATE password_reset_tokens
			SET used_at = NOW()
			WHERE user_id = ${userId} AND used_at IS NULL AND token_type = ${tokenType}
		`;

		// Generate secure random token (32 bytes = 64 hex chars)
		const token = randomBytes(32).toString('hex');
		const tokenHash = hashToken(token);
		const expiryMinutes = TOKEN_EXPIRY_MINUTES[tokenType];
		const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

		await sql`
			INSERT INTO password_reset_tokens (user_id, token_hash, token_type, expires_at)
			VALUES (${userId}, ${tokenHash}, ${tokenType}, ${expiresAt})
		`;

		return token; // Return plain token for email
	},

	/**
	 * Create a token by email address (looks up user ID first)
	 * Useful for welcome tokens where we have the email but not the user ID
	 *
	 * @param email - The email address to look up
	 * @param tokenType - The token type: 'reset' (1 hour) or 'welcome' (7 days). Defaults to 'welcome'.
	 * @returns The plain token if user exists, null if no user found with that email
	 */
	async createByEmail(email: string, tokenType: TokenType = 'welcome'): Promise<string | null> {
		// Look up user by email
		const userRows = await sql<{ id: string }[]>`
			SELECT id FROM users WHERE email = ${email}
		`;

		if (userRows.length === 0) {
			return null; // No user found
		}

		const userId = userRows[0].id;
		return this.create(userId, tokenType);
	},

	/**
	 * Verify a token and return the associated user ID if valid
	 * Returns null if token is invalid, expired, already used, or wrong type
	 *
	 * @param token - The plain token to verify
	 * @param expectedType - Optional token type to validate. If provided, token must match this type.
	 */
	async verify(token: string, expectedType?: TokenType): Promise<string | null> {
		const tokenHash = hashToken(token);

		// Build query based on whether we're checking token type
		if (expectedType) {
			const rows = await sql<{ userId: string }[]>`
				SELECT user_id as "userId"
				FROM password_reset_tokens
				WHERE token_hash = ${tokenHash}
				  AND used_at IS NULL
				  AND expires_at > NOW()
				  AND token_type = ${expectedType}
			`;
			return rows[0]?.userId ?? null;
		}

		// No type check - accept any valid token
		const rows = await sql<{ userId: string }[]>`
			SELECT user_id as "userId"
			FROM password_reset_tokens
			WHERE token_hash = ${tokenHash}
			  AND used_at IS NULL
			  AND expires_at > NOW()
		`;

		return rows[0]?.userId ?? null;
	},

	/**
	 * Mark a token as used (single-use tokens)
	 * Returns true if token was valid and marked as used
	 */
	async markUsed(token: string): Promise<boolean> {
		const tokenHash = hashToken(token);

		const result = await sql`
			UPDATE password_reset_tokens
			SET used_at = NOW()
			WHERE token_hash = ${tokenHash}
			  AND used_at IS NULL
			  AND expires_at > NOW()
		`;

		return result.count > 0;
	},

	/**
	 * Check rate limiting - returns true if request should be blocked
	 *
	 * Limits:
	 * - 5 attempts per email per 15 minutes
	 * - 10 attempts per IP per 15 minutes
	 */
	async isRateLimited(email: string, ipAddress: string | null): Promise<boolean> {
		const windowMinutes = 15;
		const maxEmailAttempts = 5;
		const maxIpAttempts = 10;

		// Calculate cutoff time in JS (safer than SQL INTERVAL interpolation)
		const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

		// Check by email
		const emailAttempts = await sql<{ count: string }[]>`
			SELECT COUNT(*)::text as count
			FROM password_reset_attempts
			WHERE email = ${email}
			  AND attempted_at > ${cutoff}
		`;

		if (parseInt(emailAttempts[0]?.count ?? '0', 10) >= maxEmailAttempts) {
			return true;
		}

		// Check by IP if provided (more lenient)
		if (ipAddress) {
			const ipAttempts = await sql<{ count: string }[]>`
				SELECT COUNT(*)::text as count
				FROM password_reset_attempts
				WHERE ip_address = ${ipAddress}
				  AND attempted_at > ${cutoff}
			`;

			if (parseInt(ipAttempts[0]?.count ?? '0', 10) >= maxIpAttempts) {
				return true;
			}
		}

		return false;
	},

	/**
	 * Record a password reset attempt for rate limiting
	 */
	async recordAttempt(email: string, ipAddress: string | null): Promise<void> {
		await sql`
			INSERT INTO password_reset_attempts (email, ip_address)
			VALUES (${email}, ${ipAddress})
		`;
	},

	/**
	 * Cleanup old tokens and attempts (run periodically)
	 * Safe to call repeatedly - uses absolute time comparisons
	 */
	async cleanup(): Promise<void> {
		// Delete tokens older than 24 hours
		const tokenCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
		await sql`
			DELETE FROM password_reset_tokens
			WHERE created_at < ${tokenCutoff}
		`;

		// Delete attempts older than 1 hour
		const attemptCutoff = new Date(Date.now() - 60 * 60 * 1000);
		await sql`
			DELETE FROM password_reset_attempts
			WHERE attempted_at < ${attemptCutoff}
		`;
	},

	/**
	 * Find token by ID (for debugging/admin purposes)
	 */
	async findById(id: string): Promise<PasswordResetToken | null> {
		const rows = await sql<PasswordResetTokenRow[]>`
			SELECT * FROM password_reset_tokens
			WHERE id = ${id}
		`;
		return rows.length > 0 ? rowToToken(rows[0]) : null;
	}
};
