<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import ConversationItem from './ConversationItem.svelte';

	interface Props {
		onNewChat: () => void;
	}

	let { onNewChat }: Props = $props();

	let searchQuery = $state('');
	let searchInputRef: HTMLInputElement | undefined = $state();
	let isSearchFocused = $state(false);

	// Helper function to filter conversations by query
	function filterByQuery(conversations: typeof chatStore.pinnedConversations, query: string) {
		if (!query.trim()) return conversations;
		const lowerQuery = query.toLowerCase();
		return conversations.filter((conv) => {
			if (conv.title.toLowerCase().includes(lowerQuery)) return true;
			return conv.messages.some((m) => m.content.toLowerCase().includes(lowerQuery));
		});
	}

	// Filtered conversations split into pinned and unpinned
	// Using $derived.by to ensure proper reactivity with searchQuery
	let filteredPinned = $derived.by(() => filterByQuery(chatStore.pinnedConversations, searchQuery));
	let filteredUnpinned = $derived.by(() => filterByQuery(chatStore.unpinnedConversations, searchQuery));
	let hasResults = $derived(filteredPinned.length > 0 || filteredUnpinned.length > 0);
	let hasPinnedResults = $derived(filteredPinned.length > 0);

	function handleConversationClick(id: string) {
		chatStore.setActiveConversation(id);
	}

	function handleDeleteConversation(id: string) {
		chatStore.deleteConversation(id);
	}

	function handlePinConversation(id: string) {
		chatStore.togglePin(id);
	}

	function clearSearch() {
		searchQuery = '';
		searchInputRef?.focus();
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && searchQuery) {
			e.preventDefault();
			clearSearch();
		}
	}

	function closeSidebar() {
		settingsStore.setSidebarOpen(false);
	}
</script>

<!-- Mobile backdrop -->
{#if settingsStore.sidebarOpen}
	<button
		type="button"
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
		onclick={closeSidebar}
		transition:fade={{ duration: 200 }}
		aria-label="Close sidebar"
	></button>
{/if}

<!-- Sidebar -->
<aside
	class="fixed lg:relative z-50 h-full w-[280px] bg-surface-900 border-r border-surface-800
		   flex flex-col transform transition-transform duration-300 ease-out
		   {settingsStore.sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:border-0 lg:overflow-hidden'}"
>
	<!-- New Chat Button -->
	<div class="p-4 border-b border-surface-800">
		<button type="button" class="btn-primary w-full flex items-center justify-center gap-2" onclick={onNewChat}>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			<span>New Chat</span>
		</button>
	</div>

	<!-- Search -->
	<div class="px-4 py-3">
		<div class="relative">
			<svg
				class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-150
					   {isSearchFocused ? 'text-primary-400' : 'text-surface-500'}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
			<input
				bind:this={searchInputRef}
				type="text"
				placeholder="Search conversations..."
				class="w-full pl-10 pr-9 py-2 bg-surface-800 border border-surface-700 rounded-xl
					   text-sm text-surface-100 placeholder-surface-500
					   focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
					   transition-all duration-200"
				bind:value={searchQuery}
				onfocus={() => (isSearchFocused = true)}
				onblur={() => (isSearchFocused = false)}
				onkeydown={handleSearchKeydown}
			/>
			<!-- Clear button -->
			{#if searchQuery}
				<button
					type="button"
					class="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full
						   text-surface-500 hover:text-surface-300 hover:bg-surface-700
						   transition-all duration-150"
					onclick={clearSearch}
					title="Clear search (Esc)"
					transition:fade={{ duration: 150 }}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<!-- Conversation List -->
	<div class="flex-1 overflow-y-auto py-2 scrollbar-hide">
		{#if !hasResults}
			<div class="px-4 py-8 text-center text-surface-500">
				{#if searchQuery}
					<svg
						class="w-10 h-10 mx-auto mb-3 text-surface-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					<p class="text-sm">No results for "{searchQuery}"</p>
					<p class="text-xs text-surface-600 mt-1">Try a different search term</p>
				{:else}
					<svg
						class="w-12 h-12 mx-auto mb-3 text-surface-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
					<p class="text-sm">No conversations yet</p>
					<p class="text-xs text-surface-600 mt-1">Start a new chat to begin</p>
				{/if}
			</div>
		{:else}
			<!-- Pinned Section -->
			{#if hasPinnedResults}
				<div class="pinned-section" in:fly={{ y: -10, duration: 200 }}>
					<div class="section-header">
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
							<path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
						</svg>
						<span>Pinned</span>
					</div>
					{#each filteredPinned as conversation (conversation.id)}
						<ConversationItem
							{conversation}
							active={conversation.id === chatStore.activeConversationId}
							onclick={() => handleConversationClick(conversation.id)}
							ondelete={() => handleDeleteConversation(conversation.id)}
							onpin={() => handlePinConversation(conversation.id)}
						/>
					{/each}
				</div>

				<!-- Divider between pinned and recent -->
				{#if filteredUnpinned.length > 0}
					<div class="section-divider"></div>
				{/if}
			{/if}

			<!-- Recent/Unpinned Section -->
			{#if filteredUnpinned.length > 0}
				{#if hasPinnedResults}
					<div class="section-header mt-1">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Recent</span>
					</div>
				{/if}
				{#each filteredUnpinned as conversation (conversation.id)}
					<ConversationItem
						{conversation}
						active={conversation.id === chatStore.activeConversationId}
						onclick={() => handleConversationClick(conversation.id)}
						ondelete={() => handleDeleteConversation(conversation.id)}
						onpin={() => handlePinConversation(conversation.id)}
					/>
				{/each}
			{/if}
		{/if}
	</div>

	<!-- Footer -->
	<div class="p-4 border-t border-surface-800">
		<div class="flex items-center justify-between text-xs text-surface-500">
			<span>{chatStore.conversationCount} conversation{chatStore.conversationCount === 1 ? '' : 's'}</span>
			{#if chatStore.conversationCount > 0}
				<button
					type="button"
					class="text-surface-500 hover:text-red-400 transition-colors"
					onclick={() => {
						if (confirm('Delete all conversations?')) {
							chatStore.clearAll();
						}
					}}
				>
					Clear all
				</button>
			{/if}
		</div>
	</div>
</aside>
