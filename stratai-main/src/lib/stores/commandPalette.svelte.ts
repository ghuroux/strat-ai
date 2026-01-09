/**
 * Command Palette Store
 *
 * Global state for the command palette modal.
 * Handles open/close state and search query.
 */

class CommandPaletteStore {
	isOpen = $state(false);
	searchQuery = $state('');

	/**
	 * Open the command palette
	 */
	open() {
		this.isOpen = true;
		this.searchQuery = '';
	}

	/**
	 * Close the command palette
	 */
	close() {
		this.isOpen = false;
		this.searchQuery = '';
	}

	/**
	 * Toggle the command palette
	 */
	toggle() {
		if (this.isOpen) {
			this.close();
		} else {
			this.open();
		}
	}

	/**
	 * Update the search query
	 */
	setQuery(query: string) {
		this.searchQuery = query;
	}
}

export const commandPaletteStore = new CommandPaletteStore();
