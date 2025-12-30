import type { SpaceType, SpaceConfig } from '$lib/types/chat';

/**
 * Space configurations for productivity environments
 *
 * Each space has:
 * - Visual identity (icon, accent color)
 * - Description for the selector
 * - Future: default model, system prompt additions, templates
 */
export const SPACES: Record<SpaceType, SpaceConfig> = {
	work: {
		id: 'work',
		name: 'Work',
		icon: '💼',
		accentColor: 'blue',
		description: 'Professional tasks, meetings, emails, and status updates'
	},
	research: {
		id: 'research',
		name: 'Research',
		icon: '🔬',
		accentColor: 'purple',
		description: 'Explore topics, synthesize findings, and analyze information'
	},
	random: {
		id: 'random',
		name: 'Random',
		icon: '🎲',
		accentColor: 'orange',
		description: 'Experimental ideas and casual exploration'
	},
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
 * All four system spaces are now available
 */
export const ENABLED_SPACES: SpaceType[] = ['work', 'research', 'random', 'personal'];

/**
 * Get space config by ID, returns undefined if not found or not enabled
 */
export function getSpaceConfig(spaceId: string): SpaceConfig | undefined {
	if (!ENABLED_SPACES.includes(spaceId as SpaceType)) {
		return undefined;
	}
	return SPACES[spaceId as SpaceType];
}

/**
 * Check if a space ID is valid and enabled
 */
export function isValidSpace(spaceId: string): spaceId is SpaceType {
	return ENABLED_SPACES.includes(spaceId as SpaceType);
}

/**
 * Get all enabled space configs
 */
export function getEnabledSpaces(): SpaceConfig[] {
	return ENABLED_SPACES.map(id => SPACES[id]);
}
