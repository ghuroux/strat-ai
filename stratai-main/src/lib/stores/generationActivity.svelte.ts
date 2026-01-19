/**
 * Generation Activity Store
 *
 * Tracks AI generation activity state and timing for progress indicators.
 * Provides reactive state for isGenerating, startTime, and elapsedSeconds.
 */

// Svelte 5 reactive state using $state rune
class GenerationActivityStore {
	isGenerating = $state(false);
	startTime = $state<number | null>(null);
	elapsedSeconds = $state(0);

	private intervalId: number | null = null;

	/**
	 * Start generation tracking
	 * Sets isGenerating to true, records start time, and begins elapsed timer
	 */
	startGeneration(): void {
		this.isGenerating = true;
		this.startTime = Date.now();
		this.elapsedSeconds = 0;

		// Clear any existing interval
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
		}

		// Update elapsed seconds every second
		this.intervalId = setInterval(() => {
			if (this.startTime !== null) {
				this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
			}
		}, 1000) as unknown as number;
	}

	/**
	 * Stop generation tracking
	 * Sets isGenerating to false, clears interval, and resets state
	 */
	stopGeneration(): void {
		this.isGenerating = false;

		// Clear interval to prevent memory leaks
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		// Reset state
		this.startTime = null;
		this.elapsedSeconds = 0;
	}
}

export const generationActivityStore = new GenerationActivityStore();
