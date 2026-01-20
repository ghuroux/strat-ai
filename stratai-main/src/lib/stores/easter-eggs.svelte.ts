/**
 * Easter Eggs Store
 *
 * Tracks discovered easter eggs and persists to localStorage.
 * Provides reactive state for easter egg features.
 */

const STORAGE_KEY = 'stratai-easter-eggs';

export interface EasterEggDiscovery {
	id: string;
	discoveredAt: number;
}

export interface EasterEggState {
	discoveries: EasterEggDiscovery[];
	konamiSequence: string[];
	logoClickCount: number;
	logoClickTimer: number | null;
}

class EasterEggsStore {
	// Discovered easter eggs
	discoveries = $state<EasterEggDiscovery[]>([]);

	// Konami code tracking: ↑↑↓↓←→←→BA
	konamiSequence = $state<string[]>([]);
	readonly KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

	// Logo click tracking
	logoClickCount = $state(0);
	private logoClickTimer: ReturnType<typeof setTimeout> | null = null;
	readonly LOGO_CLICK_TARGET = 7;
	readonly LOGO_CLICK_TIMEOUT = 2000; // 2 seconds to complete sequence

	// Barrel roll state
	barrelRollActive = $state(false);

	// Matrix rain state (for hacker theme entrance)
	matrixRainActive = $state(false);

	// Confetti state (for party mode and celebrations)
	confettiActive = $state(false);

	constructor() {
		// Load from localStorage on client
		if (typeof window !== 'undefined') {
			this.loadFromStorage();
		}
	}

	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const data = JSON.parse(stored);
				this.discoveries = data.discoveries || [];
			}
		} catch (e) {
			console.warn('[EasterEggs] Failed to load from storage:', e);
		}
	}

	private saveToStorage(): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({
				discoveries: this.discoveries
			}));
		} catch (e) {
			console.warn('[EasterEggs] Failed to save to storage:', e);
		}
	}

	/**
	 * Check if an easter egg has been discovered
	 */
	hasDiscovered(id: string): boolean {
		return this.discoveries.some(d => d.id === id);
	}

	/**
	 * Mark an easter egg as discovered
	 */
	discover(id: string): boolean {
		if (this.hasDiscovered(id)) {
			return false; // Already discovered
		}

		this.discoveries.push({
			id,
			discoveredAt: Date.now()
		});
		this.saveToStorage();
		return true;
	}

	/**
	 * Track a keypress for Konami code detection
	 * Returns true if Konami code was completed
	 */
	trackKonamiKey(code: string): boolean {
		this.konamiSequence.push(code);

		// Keep only the last 10 keys (length of Konami code)
		if (this.konamiSequence.length > 10) {
			this.konamiSequence.shift();
		}

		// Check if sequence matches
		if (this.konamiSequence.length === 10) {
			const matches = this.konamiSequence.every((key, i) => key === this.KONAMI_CODE[i]);
			if (matches) {
				this.konamiSequence = []; // Reset
				return true;
			}
		}

		return false;
	}

	/**
	 * Track a logo click
	 * Returns true if click count target was reached
	 */
	trackLogoClick(): boolean {
		this.logoClickCount++;

		// Reset timer on each click
		if (this.logoClickTimer) {
			clearTimeout(this.logoClickTimer);
		}

		// Set timeout to reset count
		this.logoClickTimer = setTimeout(() => {
			this.logoClickCount = 0;
		}, this.LOGO_CLICK_TIMEOUT);

		// Check if target reached
		if (this.logoClickCount >= this.LOGO_CLICK_TARGET) {
			this.logoClickCount = 0;
			if (this.logoClickTimer) {
				clearTimeout(this.logoClickTimer);
				this.logoClickTimer = null;
			}
			return true;
		}

		return false;
	}

	/**
	 * Trigger barrel roll animation
	 */
	triggerBarrelRoll(): void {
		if (this.barrelRollActive) return;

		this.barrelRollActive = true;

		// Reset after animation completes
		setTimeout(() => {
			this.barrelRollActive = false;
		}, 1000);
	}

	/**
	 * Trigger matrix rain animation (hacker theme entrance)
	 */
	triggerMatrixRain(): void {
		if (this.matrixRainActive) return;
		this.matrixRainActive = true;
	}

	/**
	 * Called when matrix rain animation completes
	 */
	onMatrixRainComplete(): void {
		this.matrixRainActive = false;
	}

	/**
	 * Trigger confetti celebration!
	 * Used for party mode, milestones, achievements, etc.
	 */
	triggerConfetti(): void {
		if (this.confettiActive) return;
		this.confettiActive = true;
	}

	/**
	 * Called when confetti animation completes
	 */
	onConfettiComplete(): void {
		this.confettiActive = false;
	}

	/**
	 * Get total discovered count
	 */
	get discoveredCount(): number {
		return this.discoveries.length;
	}

	/**
	 * Reset all discoveries (for testing)
	 */
	reset(): void {
		this.discoveries = [];
		this.konamiSequence = [];
		this.logoClickCount = 0;
		this.saveToStorage();
	}
}

export const easterEggsStore = new EasterEggsStore();
