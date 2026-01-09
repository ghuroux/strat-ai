/**
 * User Store
 *
 * Holds current user information for client-side access.
 * Populated from server session data via layout.
 */

export type UserRole = 'owner' | 'admin' | 'member' | null;

interface UserState {
	displayName: string | null;
	role: UserRole;
}

function createUserStore() {
	let displayName = $state<string | null>(null);
	let role = $state<UserRole>(null);

	return {
		get displayName() {
			return displayName;
		},
		get role() {
			return role;
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
				displayName = user.displayName;
				role = user.role as UserRole;
			} else {
				displayName = null;
				role = null;
			}
		},

		/**
		 * Clear user data (on logout)
		 */
		clear() {
			displayName = null;
			role = null;
		}
	};
}

export const userStore = createUserStore();
