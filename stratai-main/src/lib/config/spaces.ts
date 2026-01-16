import type { SpaceType, SpaceConfig } from '$lib/types/chat';

/**
 * Space configurations for productivity environments
 *
 * NOTE: This is legacy configuration. The actual system spaces are now
 * defined in src/lib/types/spaces.ts (SYSTEM_SPACES).
 * Only 'personal' is a true system space; all other spaces are custom.
 */
export const SPACES: Record<string, SpaceConfig> = {
	personal: {
		id: 'personal',
		name: 'Personal',
		icon: '🏠',
		accentColor: 'green',
		description: 'Personal projects and private conversations'
	}
};

/**
 * System spaces enabled for the application
 * Only Personal is a system space; users create custom spaces for other contexts
 */
export const ENABLED_SPACES: SpaceType[] = ['personal'];

/**
 * Get space config by ID, returns undefined if not found or not enabled
 */
export function getSpaceConfig(spaceId: string): SpaceConfig | undefined {
	return SPACES[spaceId];
}

/**
 * Check if a space ID is a system space
 */
export function isValidSpace(spaceId: string): boolean {
	return spaceId === 'personal';
}

/**
 * Get all enabled space configs
 */
export function getEnabledSpaces(): SpaceConfig[] {
	return Object.values(SPACES);
}
