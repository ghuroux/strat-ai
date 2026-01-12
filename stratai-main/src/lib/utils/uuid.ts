/**
 * UUID generation utility with fallback for non-secure contexts
 *
 * crypto.randomUUID() requires a secure context (HTTPS).
 * This utility provides a fallback for HTTP environments.
 */

export function generateUUID(): string {
	// crypto.randomUUID() requires secure context (HTTPS)
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	// Fallback UUID v4 generation for HTTP environments
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}
