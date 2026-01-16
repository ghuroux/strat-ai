/**
 * User Types
 *
 * Type definitions for user data and preferences.
 */

export type UserRole = 'owner' | 'admin' | 'member';

/**
 * Theme preference
 */
export type ThemePreference = 'dark' | 'light' | 'system';

/**
 * Home page preference types
 */
export type HomePageType = 'main-chat' | 'task-dashboard' | 'space' | 'area';

export interface HomePagePreference {
	type: HomePageType;
	spaceId?: string | null;
	spaceSlug?: string | null;
	areaId?: string | null;
	areaSlug?: string | null;
}

/**
 * User preferences stored in database
 */
export interface UserPreferences {
	homePage?: HomePagePreference;
	theme?: ThemePreference;
	defaultModel?: string | null;
	/**
	 * User's timezone in IANA format (e.g., 'Africa/Johannesburg', 'America/New_York', 'Europe/London').
	 * Used for temporal context in AI conversations.
	 * Auto-detected from browser on app load, can be manually overridden in Settings.
	 */
	timezone?: string;
}

export interface UserData {
	id: string;
	firstName: string | null;
	lastName: string | null;
	displayName: string | null;
	email: string;
	role: UserRole;
	preferences: UserPreferences;
}

/**
 * Get the URL for a home page preference
 */
export function getHomePageUrl(pref: HomePagePreference | undefined): string {
	if (!pref) return '/';

	switch (pref.type) {
		case 'main-chat':
			return '/';
		case 'task-dashboard':
			if (pref.spaceSlug) {
				return `/spaces/${pref.spaceSlug}/tasks`;
			}
			return '/spaces/work/tasks'; // fallback
		case 'space':
			if (pref.spaceSlug) {
				return `/spaces/${pref.spaceSlug}`;
			}
			return '/';
		case 'area':
			if (pref.spaceSlug && pref.areaSlug) {
				return `/spaces/${pref.spaceSlug}/${pref.areaSlug}`;
			}
			return '/';
		default:
			return '/';
	}
}

/**
 * Default home page preference
 */
export const DEFAULT_HOME_PAGE: HomePagePreference = {
	type: 'main-chat'
};
