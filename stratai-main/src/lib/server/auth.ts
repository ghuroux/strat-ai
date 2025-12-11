import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const HASH_ALGORITHM = 'sha256';

/**
 * Hash a password with a random salt
 */
export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const hash = createHash(HASH_ALGORITHM).update(password + salt).digest('hex');
	return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 * Uses timing-safe comparison to prevent timing attacks
 */
export function verifyPassword(password: string, storedHash: string): boolean {
	const [salt, hash] = storedHash.split(':');
	if (!salt || !hash) return false;

	const computedHash = createHash(HASH_ALGORITHM).update(password + salt).digest('hex');

	try {
		return timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
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
