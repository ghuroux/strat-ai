<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import type { Conversation } from '$lib/types/chat';

	interface Props {
		conversation: Conversation;
		active?: boolean;
		onclick?: () => void;
		ondelete?: () => void;
		onpin?: () => void;
	}

	let { conversation, active = false, onclick, ondelete, onpin }: Props = $props();

	let showActions = $state(false);
	let isPinned = $derived(conversation.pinned ?? false);

	function formatTime(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) {
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} else if (days === 1) {
			return 'Yesterday';
		} else if (days < 7) {
			return date.toLocaleDateString([], { weekday: 'short' });
		} else {
			return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
		}
	}

	function handleClick() {
		onclick?.();
	}

	function handleDelete(e: MouseEvent) {
		e.stopPropagation();
		ondelete?.();
	}

	function handlePin(e: MouseEvent) {
		e.stopPropagation();
		onpin?.();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onclick?.();
		}
	}

	function getMessagePreview(): string {
		const lastMessage = conversation.messages[conversation.messages.length - 1];
		if (!lastMessage) return 'No messages yet';
		return lastMessage.content.slice(0, 60) + (lastMessage.content.length > 60 ? '...' : '');
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="sidebar-item group w-full text-left cursor-pointer {active ? 'active' : ''}"
	onclick={handleClick}
	onkeydown={handleKeyDown}
	onmouseenter={() => (showActions = true)}
	onmouseleave={() => (showActions = false)}
	role="button"
	tabindex="0"
	in:fly={{ x: -20, duration: 200 }}
>
	<div class="flex-1 min-w-0">
		<div class="flex items-center justify-between gap-2">
			<span class="conversation-title font-medium text-sm truncate">
				{conversation.title}
			</span>
			<span class="text-xs text-surface-500 whitespace-nowrap">
				{formatTime(conversation.updatedAt)}
			</span>
		</div>
		<p class="text-xs text-surface-500 truncate mt-0.5">
			{getMessagePreview()}
		</p>
	</div>

	<!-- Action buttons container -->
	<div
		class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1"
	>
		<!-- Pin button - always visible if pinned, otherwise on hover -->
		{#if isPinned || (showActions && !active)}
			<button
				type="button"
				class="p-1.5 rounded-lg transition-all duration-150
					   {isPinned
						? 'text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20'
						: 'bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-amber-400 opacity-0 group-hover:opacity-100'}"
				onclick={handlePin}
				title={isPinned ? 'Unpin conversation' : 'Pin conversation'}
				aria-label={isPinned ? 'Unpin conversation' : 'Pin conversation'}
				transition:fade={{ duration: 150 }}
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24">
					{#if isPinned}
						<!-- Filled bookmark -->
						<path
							fill="currentColor"
							d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
						/>
					{:else}
						<!-- Outline bookmark -->
						<path
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							fill="none"
							d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
						/>
					{/if}
				</svg>
			</button>
		{/if}

		<!-- Delete button - only on hover, not for active -->
		{#if showActions && !active}
			<button
				type="button"
				class="p-1.5 rounded-lg bg-surface-700 hover:bg-red-600 text-surface-400 hover:text-white
					   transition-all duration-150 opacity-0 group-hover:opacity-100"
				onclick={handleDelete}
				title="Delete conversation"
				aria-label="Delete conversation"
				transition:fade={{ duration: 150 }}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
			</button>
		{/if}
	</div>
</div>

<style>
	.sidebar-item {
		position: relative;
	}
</style>
