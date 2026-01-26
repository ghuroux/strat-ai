/**
 * StreamingScrollController - Premium scroll behavior for streaming AI responses
 *
 * Implements the "Anchor & Follow" pattern:
 * 1. Anchor - When new assistant message created, smooth scroll to bring message start into view
 * 2. Follow - If user is near bottom, continue following as content streams
 * 3. Disengage - If user scrolls up, stop auto-following
 * 4. Indicator - Show subtle pill to jump back to new content
 *
 * Usage:
 * ```ts
 * const scrollController = createStreamingScrollController();
 *
 * // In $effect:
 * scrollController.attach(container);
 * scrollController.anchorToMessage(messageElement);
 * scrollController.onContentAppend();
 * scrollController.reset();
 * ```
 */

// Threshold in pixels - if user is within this distance from bottom, keep following
const NEAR_BOTTOM_THRESHOLD = 150;

// Debounce time for scroll listener (ms)
const SCROLL_DEBOUNCE_MS = 50;

// Offset from top when anchoring to a new message (px)
const ANCHOR_TOP_OFFSET = 80;

/**
 * Creates a streaming scroll controller with reactive state
 */
export function createStreamingScrollController() {
	// Reactive state using Svelte 5 runes
	let isAutoFollowEngaged = $state(true);
	let hasNewContentBelow = $state(false);

	// Internal state
	let container: HTMLElement | null = null;
	let lastScrollTop = 0;
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
	let isScrolling = false;

	/**
	 * Check if container is scrolled near the bottom
	 */
	function isNearBottom(): boolean {
		if (!container) return true;
		const { scrollTop, scrollHeight, clientHeight } = container;
		return scrollHeight - scrollTop - clientHeight <= NEAR_BOTTOM_THRESHOLD;
	}

	/**
	 * Debounced scroll handler
	 */
	function handleScroll() {
		if (!container || isScrolling) return;

		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}

		scrollTimeout = setTimeout(() => {
			if (!container) return;

			const currentScrollTop = container.scrollTop;
			const scrolledUp = currentScrollTop < lastScrollTop;
			const scrolledDown = currentScrollTop > lastScrollTop;

			// Detect intentional upward scroll - disengage auto-follow
			if (scrolledUp && isAutoFollowEngaged) {
				isAutoFollowEngaged = false;
				hasNewContentBelow = true;
			}

			// Detect scroll to bottom - re-engage auto-follow
			if (scrolledDown && isNearBottom()) {
				isAutoFollowEngaged = true;
				hasNewContentBelow = false;
			}

			lastScrollTop = currentScrollTop;
		}, SCROLL_DEBOUNCE_MS);
	}

	/**
	 * Attach the controller to a scroll container
	 */
	function attach(element: HTMLElement): void {
		if (container) {
			detach();
		}

		container = element;
		lastScrollTop = element.scrollTop;
		element.addEventListener('scroll', handleScroll, { passive: true });
	}

	/**
	 * Detach from the current container
	 */
	function detach(): void {
		if (container) {
			container.removeEventListener('scroll', handleScroll);
		}
		container = null;

		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
			scrollTimeout = null;
		}
	}

	/**
	 * Anchor scroll to a new message element
	 * Smoothly scrolls so the message start is visible with offset from top
	 */
	function anchorToMessage(messageElement: HTMLElement): void {
		if (!container || !messageElement) return;

		isScrolling = true;

		// Calculate target scroll position
		const containerRect = container.getBoundingClientRect();
		const messageRect = messageElement.getBoundingClientRect();
		const offsetTop = messageRect.top - containerRect.top + container.scrollTop;
		const targetScrollTop = Math.max(0, offsetTop - ANCHOR_TOP_OFFSET);

		container.scrollTo({
			top: targetScrollTop,
			behavior: 'smooth'
		});

		// Re-enable scroll detection after animation
		setTimeout(() => {
			isScrolling = false;
			if (container) {
				lastScrollTop = container.scrollTop;
			}
		}, 300);

		// Start with auto-follow engaged
		isAutoFollowEngaged = true;
		hasNewContentBelow = false;
	}

	/**
	 * Called when content is appended during streaming
	 * Follows to bottom if auto-follow is engaged
	 */
	function onContentAppend(): void {
		if (!container) return;

		if (isAutoFollowEngaged) {
			// Smoothly follow to bottom
			isScrolling = true;
			container.scrollTo({
				top: container.scrollHeight,
				behavior: 'auto' // Use instant scroll during streaming to avoid jitter
			});
			lastScrollTop = container.scrollTop;

			// Brief delay before re-enabling scroll detection
			requestAnimationFrame(() => {
				isScrolling = false;
			});
		} else {
			// User scrolled away, indicate new content below
			hasNewContentBelow = true;
		}
	}

	/**
	 * Scroll to new content (called when user clicks indicator)
	 */
	function scrollToNewContent(): void {
		if (!container) return;

		isScrolling = true;
		container.scrollTo({
			top: container.scrollHeight,
			behavior: 'smooth'
		});

		// Re-engage auto-follow
		isAutoFollowEngaged = true;
		hasNewContentBelow = false;

		// Re-enable scroll detection after animation
		setTimeout(() => {
			isScrolling = false;
			if (container) {
				lastScrollTop = container.scrollTop;
			}
		}, 300);
	}

	/**
	 * Reset controller state (called when streaming ends)
	 */
	function reset(): void {
		isAutoFollowEngaged = true;
		hasNewContentBelow = false;
	}

	// Return object with reactive getters and methods
	return {
		// Reactive state as getters
		get isAutoFollowEngaged() {
			return isAutoFollowEngaged;
		},
		get hasNewContentBelow() {
			return hasNewContentBelow;
		},

		// Methods
		attach,
		detach,
		anchorToMessage,
		onContentAppend,
		scrollToNewContent,
		reset
	};
}

// Type for the controller
export type StreamingScrollController = ReturnType<typeof createStreamingScrollController>;
