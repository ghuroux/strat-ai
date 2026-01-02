<!--
	AreaWelcomeScreen.svelte

	Area-specific welcome screen with:
	- Area identity (name, icon, color)
	- Area context preview (if set)
	- Recent conversations in this area
	- Clear CTAs (Continue / Start New)
-->
<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import type { Area } from '$lib/types/areas';
	import type { Conversation } from '$lib/types/chat';

	interface Props {
		area: Area;
		recentConversations: Conversation[];
		hasModel: boolean;
		onNewChat: () => void;
		onContinueChat: (conversationId: string) => void;
	}

	let { area, recentConversations, hasModel, onNewChat, onContinueChat }: Props = $props();

	// Get the most recent conversation (if any)
	let lastConversation = $derived(recentConversations[0] ?? null);

	// Format relative time
	function formatRelativeTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days}d ago`;
		return new Date(timestamp).toLocaleDateString();
	}

	// Get first line of conversation for preview
	function getConversationPreview(conv: Conversation): string {
		const firstUserMessage = conv.messages.find(m => m.role === 'user');
		if (!firstUserMessage) return conv.title || 'Untitled conversation';
		const content = firstUserMessage.content;
		return content.length > 80 ? content.slice(0, 80) + '...' : content;
	}
</script>

<div class="h-full flex items-center justify-center min-h-[60vh]" in:fade={{ duration: 300 }}>
	<div class="text-center max-w-lg w-full px-4">
		<!-- Area Icon -->
		<div
			class="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center text-3xl"
			style="background: color-mix(in srgb, {area.color || 'var(--space-accent)'} 15%, transparent);
				   border: 1px solid color-mix(in srgb, {area.color || 'var(--space-accent)'} 30%, transparent);"
		>
			{#if area.icon}
				<span>{area.icon}</span>
			{:else}
				<svg
					class="w-10 h-10"
					style="color: {area.color || 'var(--space-accent)'};"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
				</svg>
			{/if}
		</div>

		<!-- Area Name -->
		<h2
			class="text-2xl font-bold mb-2"
			style="color: {area.color || 'var(--space-accent)'};"
		>
			{area.name}
		</h2>

		<!-- Area Context Preview -->
		{#if area.context}
			<p class="text-surface-400 text-sm mb-6 leading-relaxed line-clamp-2">
				{area.context}
			</p>
		{:else}
			<p class="text-surface-500 text-sm mb-6">
				{area.isGeneral ? 'Your general workspace for this space' : 'Start a conversation in this area'}
			</p>
		{/if}

		<!-- Continue Last Conversation (if exists) -->
		{#if lastConversation && hasModel}
			<div
				class="mb-6 p-4 rounded-xl border text-left transition-all hover:border-opacity-60 cursor-pointer group"
				style="background: color-mix(in srgb, {area.color || 'var(--space-accent)'} 5%, transparent);
					   border-color: color-mix(in srgb, {area.color || 'var(--space-accent)'} 20%, transparent);"
				onclick={() => onContinueChat(lastConversation.id)}
				onkeydown={(e) => e.key === 'Enter' && onContinueChat(lastConversation.id)}
				role="button"
				tabindex="0"
			>
				<div class="flex items-start gap-3">
					<div
						class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
						style="background: color-mix(in srgb, {area.color || 'var(--space-accent)'} 15%, transparent);"
					>
						<svg
							class="w-4 h-4"
							style="color: {area.color || 'var(--space-accent)'};"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center justify-between mb-1">
							<span class="text-xs text-surface-500">Continue where you left off</span>
							<span class="text-xs text-surface-600">{formatRelativeTime(lastConversation.updatedAt)}</span>
						</div>
						<p class="text-sm text-surface-200 truncate group-hover:text-surface-100 transition-colors">
							{getConversationPreview(lastConversation)}
						</p>
					</div>
					<svg
						class="w-5 h-5 text-surface-600 group-hover:text-surface-400 transition-colors flex-shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</div>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="flex flex-col gap-3">
			{#if !hasModel}
				<div class="flex items-center justify-center gap-2 text-sm text-surface-500">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
					</svg>
					<span>Select a model above to get started</span>
				</div>
			{:else}
				<button
					type="button"
					onclick={onNewChat}
					class="mx-auto px-6 py-2.5 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90"
					style="background: {area.color || 'var(--space-accent)'};"
				>
					{lastConversation ? 'Start New Chat' : 'Start a Chat'}
				</button>
			{/if}
		</div>

		<!-- Recent Conversations (if more than just the last one) -->
		{#if recentConversations.length > 1 && hasModel}
			<div class="mt-8">
				<div class="flex items-center justify-between mb-3">
					<h3 class="text-xs font-medium text-surface-500 uppercase tracking-wider">
						Recent in {area.name}
					</h3>
					<span class="text-xs text-surface-600">{recentConversations.length} total</span>
				</div>
				<div class="space-y-2">
					{#each recentConversations.slice(1, 4) as conv (conv.id)}
						<button
							type="button"
							class="w-full p-3 rounded-lg border text-left transition-all hover:bg-surface-800/50 group"
							style="border-color: rgba(255,255,255,0.06);"
							onclick={() => onContinueChat(conv.id)}
						>
							<div class="flex items-center justify-between">
								<span class="text-sm text-surface-300 truncate flex-1 group-hover:text-surface-100 transition-colors">
									{conv.title || getConversationPreview(conv)}
								</span>
								<span class="text-xs text-surface-600 ml-3 flex-shrink-0">
									{formatRelativeTime(conv.updatedAt)}
								</span>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Context Documents Indicator -->
		{#if area.contextDocumentIds && area.contextDocumentIds.length > 0}
			<div class="mt-6 flex items-center justify-center gap-2 text-xs text-surface-500">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				<span>{area.contextDocumentIds.length} reference document{area.contextDocumentIds.length === 1 ? '' : 's'} attached</span>
			</div>
		{/if}
	</div>
</div>
