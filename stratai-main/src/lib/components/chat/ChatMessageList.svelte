<script lang="ts">
	/**
	 * ChatMessageList - Unified container for chat messages
	 *
	 * Provides consistent layout across all chat contexts:
	 * - Full-width scrollable container (scroll works from anywhere)
	 * - Centered content with max-width for readability
	 * - Responsive padding
	 * - Consistent scrollbar styling
	 *
	 * Usage:
	 * <ChatMessageList bind:containerRef={messagesContainer}>
	 *   {#each messages as message}
	 *     <ChatMessage {message} />
	 *   {/each}
	 * </ChatMessageList>
	 */

	interface Props {
		/** Bindable reference to the scroll container (for scroll-to-bottom) */
		containerRef?: HTMLElement;
		/** Optional max-width override (default: 960px) */
		maxWidth?: string;
		/** Optional class to add to the container */
		class?: string;
	}

	let {
		containerRef = $bindable(),
		maxWidth = '960px',
		class: className = ''
	}: Props = $props();
</script>

<div
	bind:this={containerRef}
	class="message-list {className}"
>
	<div class="message-list-content" style="--max-width: {maxWidth};">
		<slot />
	</div>
</div>

<style>
	.message-list {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1rem;
	}

	@media (min-width: 768px) {
		.message-list {
			padding: 1.5rem 2rem;
		}
	}

	.message-list-content {
		max-width: var(--max-width, 960px);
		margin-left: auto;
		margin-right: auto;
	}

	/* Scrollbar styling */
	.message-list::-webkit-scrollbar {
		width: 6px;
	}

	.message-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.message-list::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.message-list::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
