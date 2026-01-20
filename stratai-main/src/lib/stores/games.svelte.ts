/**
 * Games Store
 *
 * Manages mini-game modal visibility.
 * Allows opening games from Command Palette or other UI.
 */

// =============================================================================
// State
// =============================================================================

let isSnakeOpen = $state(false);
let isWordleOpen = $state(false);

// =============================================================================
// Store Export
// =============================================================================

export const gameStore = {
	// =========================================================================
	// Snake
	// =========================================================================
	get isSnakeOpen() {
		return isSnakeOpen;
	},

	openSnake() {
		isSnakeOpen = true;
	},

	closeSnake() {
		isSnakeOpen = false;
	},

	toggleSnake() {
		isSnakeOpen = !isSnakeOpen;
	},

	// =========================================================================
	// Wordle
	// =========================================================================
	get isWordleOpen() {
		return isWordleOpen;
	},

	openWordle() {
		isWordleOpen = true;
	},

	closeWordle() {
		isWordleOpen = false;
	},

	toggleWordle() {
		isWordleOpen = !isWordleOpen;
	}
};
