import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * Hash a password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a stored bcrypt hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	try {
		return await bcrypt.compare(password, storedHash);
	} catch {
		return false;
	}
}

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(): string {
	return randomBytes(32).toString('hex');
}

/**
 * Generate a temporary password for new users
 * Returns a URL-safe base64 string (16 characters)
 */
export function generateTempPassword(): string {
	return randomBytes(12).toString('base64url');
}
