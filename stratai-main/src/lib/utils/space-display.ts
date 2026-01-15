/**
 * Space Display Utilities
 *
 * Shared functions for displaying space information consistently.
 * Handles name collision disambiguation for invited spaces.
 */

import type { Space } from '$lib/types/spaces';

/**
 * Get display name for a space, adding owner context for invited spaces.
 *
 * Rules:
 * - Owned spaces: Just the name (e.g., "Work")
 * - Organization spaces: Just the name (e.g., "StratGroup")
 * - Invited spaces: Name with owner's first name (e.g., "Work (Gabriel)")
 *
 * @param space - The space to get display name for
 * @param currentUserId - The current user's ID
 * @returns Display name with optional owner context
 */
export function getSpaceDisplayName(space: Space, currentUserId: string): string {
	// Owned spaces - just the name
	if (space.userId === currentUserId) {
		return space.name;
	}

	// Organization spaces - just the name (org context is implicit)
	if (space.spaceType === 'organization') {
		return space.name;
	}

	// Invited space - add owner context if available
	if (space.ownerFirstName) {
		return `${space.name} (${space.ownerFirstName})`;
	}

	// Fallback: try first word of display name
	if (space.ownerDisplayName) {
		const firstName = space.ownerDisplayName.split(' ')[0];
		if (firstName) {
			return `${space.name} (${firstName})`;
		}
	}

	// Final fallback: just the name
	return space.name;
}
