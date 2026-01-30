/**
 * Context Snapshot Modal — localStorage helpers
 *
 * Manages "don't show again" dismissal state per area/task.
 * Safe fallback: if localStorage unavailable, modal always shows.
 */

const PREFIX = 'stratai-context-modal-dismissed';

function buildKey(type: string, id: string): string {
	return `${PREFIX}:${type}:${id}`;
}

/** Check if user has permanently dismissed the context snapshot modal for this entity */
export function isContextSnapshotDismissed(type: string, id: string): boolean {
	try {
		return localStorage.getItem(buildKey(type, id)) === 'true';
	} catch {
		return false; // Safe default: show modal
	}
}

/** Persist "don't show again" for this entity */
export function dismissContextSnapshot(type: string, id: string): void {
	try {
		localStorage.setItem(buildKey(type, id), 'true');
	} catch {
		// localStorage unavailable (e.g., Safari private browsing) — no-op
	}
}
