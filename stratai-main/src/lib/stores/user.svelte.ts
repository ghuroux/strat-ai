/**
 * User Store
 *
 * Holds current user information for client-side access.
 * Populated from server session data via layout.
 */

import {
	type UserRole,
	type UserPreferences,
	type HomePagePreference,
	getHomePageUrl,
	DEFAULT_HOME_PAGE
} from '$lib/types/user';

export type { UserRole };

interface UserState {
	id?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	displayName: string | null;
	email?: string | null;
	role: UserRole | null;
	preferences?: UserPreferences;
}

function createUserStore() {
	let id = $state<string | null>(null);
	let firstName = $state<string | null>(null);
	let lastName = $state<string | null>(null);
	let displayName = $state<string | null>(null);
	let email = $state<string | null>(null);
	let role = $state<UserRole | null>(null);
	let preferences = $state<UserPreferences>({});

	return {
		get id() {
			return id;
		},
		get firstName() {
			return firstName;
		},
		get lastName() {
			return lastName;
		},
		get displayName() {
			return displayName;
		},
		get email() {
			return email;
		},
		get role() {
			return role;
		},
		get preferences() {
			return preferences;
		},

		/**
		 * Get the full user object for convenience
		 */
		get user(): UserState | null {
			if (!role) return null;
			return { id, firstName, lastName, displayName, email, role, preferences };
		},

		/**
		 * Get the home page preference
		 */
		get homePage(): HomePagePreference {
			return preferences.homePage ?? DEFAULT_HOME_PAGE;
		},

		/**
		 * Get the URL for the user's preferred home page
		 */
		get homeUrl(): string {
			return getHomePageUrl(preferences.homePage);
		},

		/**
		 * Check if user has admin privileges (owner or admin)
		 */
		get isAdmin() {
			return role === 'owner' || role === 'admin';
		},

		/**
		 * Check if user is the organization owner
		 */
		get isOwner() {
			return role === 'owner';
		},

		/**
		 * Update user data from server
		 */
		setUser(user: UserState | null) {
			if (user) {
				id = user.id ?? null;
				firstName = user.firstName ?? null;
				lastName = user.lastName ?? null;
				displayName = user.displayName;
				email = user.email ?? null;
				role = user.role as UserRole;
				preferences = user.preferences ?? {};
			} else {
				id = null;
				firstName = null;
				lastName = null;
				displayName = null;
				email = null;
				role = null;
				preferences = {};
			}
		},

		/**
		 * Update preferences (after saving to server)
		 */
		setPreferences(newPreferences: UserPreferences) {
			preferences = newPreferences;
		},

		/**
		 * Update home page preference
		 */
		setHomePage(homePage: HomePagePreference) {
			preferences = { ...preferences, homePage };
		},

		/**
		 * Clear user data (on logout)
		 */
		clear() {
			id = null;
			firstName = null;
			lastName = null;
			displayName = null;
			email = null;
			role = null;
			preferences = {};
		}
	};
}

export const userStore = createUserStore();
