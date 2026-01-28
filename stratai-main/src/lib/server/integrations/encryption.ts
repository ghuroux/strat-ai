/**
 * Integration Credential Encryption Service
 *
 * Provides AES-256-GCM encryption for OAuth tokens and API keys.
 * Uses authenticated encryption to ensure both confidentiality and integrity.
 *
 * See: docs/features/INTEGRATIONS_ARCHITECTURE.md
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';

// ============================================================================
// Configuration
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits authentication tag
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment
 * @throws Error if key is not configured or invalid
 */
function getEncryptionKey(): Buffer {
	const keyHex = env.INTEGRATION_ENCRYPTION_KEY;

	if (!keyHex) {
		throw new Error(
			'INTEGRATION_ENCRYPTION_KEY environment variable is not set. ' +
			'Generate one with: openssl rand -hex 32'
		);
	}

	// Key should be 64 hex characters (32 bytes)
	if (keyHex.length !== 64) {
		throw new Error(
			`INTEGRATION_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Got ${keyHex.length} characters.`
		);
	}

	return Buffer.from(keyHex, 'hex');
}

// ============================================================================
// Encryption Types
// ============================================================================

/**
 * Result of encrypting a value
 */
export interface EncryptedValue {
	/** Base64-encoded encrypted data */
	encryptedValue: string;
	/** Base64-encoded initialization vector */
	iv: string;
	/** Base64-encoded authentication tag */
	tag: string;
}

// ============================================================================
// Encryption Functions
// ============================================================================

/**
 * Encrypt a plaintext value using AES-256-GCM
 *
 * @param plaintext - The value to encrypt
 * @returns Encrypted value with IV and authentication tag
 */
export function encrypt(plaintext: string): EncryptedValue {
	const key = getEncryptionKey();

	// Generate a random IV for each encryption
	const iv = randomBytes(IV_LENGTH);

	// Create cipher
	const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

	// Encrypt the data
	const encrypted = Buffer.concat([
		cipher.update(plaintext, 'utf8'),
		cipher.final()
	]);

	// Get the authentication tag
	const tag = cipher.getAuthTag();

	return {
		encryptedValue: encrypted.toString('base64'),
		iv: iv.toString('base64'),
		tag: tag.toString('base64')
	};
}

/**
 * Decrypt a value encrypted with AES-256-GCM
 *
 * @param encryptedValue - Base64-encoded encrypted data
 * @param iv - Base64-encoded initialization vector
 * @param tag - Base64-encoded authentication tag
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decrypt(encryptedValue: string, iv: string, tag: string): string {
	const key = getEncryptionKey();

	// Decode base64 values
	const encryptedBuffer = Buffer.from(encryptedValue, 'base64');
	const ivBuffer = Buffer.from(iv, 'base64');
	const tagBuffer = Buffer.from(tag, 'base64');

	// Validate IV length
	if (ivBuffer.length !== IV_LENGTH) {
		throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${ivBuffer.length}`);
	}

	// Validate tag length
	if (tagBuffer.length !== TAG_LENGTH) {
		throw new Error(`Invalid tag length: expected ${TAG_LENGTH}, got ${tagBuffer.length}`);
	}

	// Create decipher
	const decipher = createDecipheriv(ALGORITHM, key, ivBuffer, { authTagLength: TAG_LENGTH });

	// Set the authentication tag
	decipher.setAuthTag(tagBuffer);

	// Decrypt the data
	try {
		const decrypted = Buffer.concat([
			decipher.update(encryptedBuffer),
			decipher.final()
		]);

		return decrypted.toString('utf8');
	} catch (error) {
		// Re-throw with a more helpful message
		throw new Error(
			'Decryption failed: Data may be corrupted or encrypted with a different key. ' +
			(error instanceof Error ? error.message : 'Unknown error')
		);
	}
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a new random encryption key (for setup/documentation purposes)
 * @returns 64-character hex string suitable for INTEGRATION_ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
	return randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Validate that the encryption key is properly configured
 * @returns true if key is valid
 * @throws Error if key is invalid
 */
export function validateEncryptionKey(): boolean {
	const key = getEncryptionKey();

	// Test encryption/decryption roundtrip
	const testValue = 'test-encryption-roundtrip-' + Date.now();
	const encrypted = encrypt(testValue);
	const decrypted = decrypt(encrypted.encryptedValue, encrypted.iv, encrypted.tag);

	if (decrypted !== testValue) {
		throw new Error('Encryption roundtrip failed: decrypted value does not match original');
	}

	return true;
}

/**
 * Check if encryption is properly configured (without throwing)
 */
export function isEncryptionConfigured(): boolean {
	try {
		validateEncryptionKey();
		return true;
	} catch {
		return false;
	}
}
