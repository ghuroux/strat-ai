<script lang="ts">
	import { fly, fade, slide } from 'svelte/transition';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import ConversationItem from './ConversationItem.svelte';

	interface Props {
		onNewChat: () => void;
		onConversationClick?: (id: string) => void;
		onShowBringToContext?: (conversation: typeof chatStore.conversationList[0]) => void;
	}

	let { onNewChat, onConversationClick, onShowBringToContext }: Props = $props();

	let searchQuery = $state('');
	let searchInputRef: HTMLInputElement | undefined = $state();
	let isSearchFocused = $state(false);
	let openMenuId = $state<string | null>(null);
	let otherContextsExpanded = $state(false);

	function handleMenuToggle(id: string, isOpen: boolean) {
		openMenuId = isOpen ? id : null;
	}

	function closeAllMenus() {
		openMenuId = null;
	}

	// Close menu when clicking outside
	function handleSidebarClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		// If click is not on a menu trigger or dropdown, close the menu
		if (!target.closest('.menu-trigger') && !target.closest('.dropdown-menu')) {
			closeAllMenus();
		}
	}

	// Helper function to filter conversations by query
	function filterByQuery(conversations: typeof chatStore.pinnedConversations, query: string) {
		if (!query.trim()) return conversations;
		const lowerQuery = query.toLowerCase();
		return conversations.filter((conv) => {
			if (conv.title.toLowerCase().includes(lowerQuery)) return true;
			return conv.messages.some((m) => m.content.toLowerCase().includes(lowerQuery));
		});
	}

	// Context-aware grouped conversations (Area-centric model)
	let grouped = $derived(chatStore.groupedConversations);

	// Filtered by search query
	let filteredPinned = $derived.by(() => filterByQuery(grouped.pinned, searchQuery));
	let filteredCurrent = $derived.by(() => filterByQuery(grouped.current, searchQuery));
	let filteredOtherInSpace = $derived.by(() => filterByQuery(grouped.otherInSpace, searchQuery));
	let filteredOtherContexts = $derived.by(() => filterByQuery(grouped.otherContexts, searchQuery));

	let hasResults = $derived(
		filteredPinned.length > 0 || filteredCurrent.length > 0 ||
		filteredOtherInSpace.length > 0 || filteredOtherContexts.length > 0
	);
	let hasPinnedResults = $derived(filteredPinned.length > 0);
	let hasCurrentResults = $derived(filteredCurrent.length > 0);
	let hasOtherInSpace = $derived(filteredOtherInSpace.length > 0);
	let hasOtherContexts = $derived(filteredOtherContexts.length > 0);

	// Determine if we're in an Area view (for section labels)
	let isInAreaView = $derived(!!chatStore.selectedAreaId);

	// State for "From Other Areas" collapsible section
	let otherAreasExpanded = $state(false);

	function handleConversationClick(id: string) {
		const conversation = chatStore.conversations.get(id);
		if (!conversation) return;

		// Check if conversation is in current context
		const inContext = chatStore.isConversationInCurrentContext(conversation);

		if (inContext) {
			// Open directly
			if (onConversationClick) {
				onConversationClick(id);
			} else {
				chatStore.setActiveConversation(id);
			}
		} else {
			// Show bring to context modal
			if (onShowBringToContext) {
				onShowBringToContext(conversation);
			} else {
				// Fallback: just open it
				chatStore.setActiveConversation(id);
			}
		}
	}

	function handleDeleteConversation(id: string) {
		chatStore.deleteConversation(id);
	}

	function handlePinConversation(id: string) {
		chatStore.togglePin(id);
	}

	function handleRenameConversation(id: string, newTitle: string) {
		chatStore.updateConversationTitle(id, newTitle);
	}

	function handleFocusTask(taskId: string) {
		taskStore.setFocusedTask(taskId);
	}

	function handleExportConversation(id: string) {
		const conversation = chatStore.conversations.get(id);
		if (!conversation) return;

		// Convert conversation to markdown
		const date = new Date(conversation.createdAt);
		const dateStr = date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

		let markdown = `# ${conversation.title}\n\n`;
		markdown += `**Model:** ${conversation.model}  \n`;
		markdown += `**Date:** ${dateStr}\n\n`;
		markdown += `---\n\n`;

		for (const message of conversation.messages) {
			const role = message.role === 'user' ? 'User' : 'Assistant';
			markdown += `## ${role}\n\n${message.content}\n\n`;
		}

		markdown += `---\n\n*Exported from StratAI*\n`;

		// Trigger download
		const blob = new Blob([markdown], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${date.toISOString().split('T')[0]}.md`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
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
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<aside
	class="fixed lg:relative z-50 h-full w-[280px] bg-surface-900 border-r border-surface-800
		   flex flex-col transform transition-transform duration-300 ease-out
		   {settingsStore.sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:border-0 lg:overflow-hidden'}"
	onclick={handleSidebarClick}
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
							menuOpen={openMenuId === conversation.id}
							onMenuToggle={(isOpen) => handleMenuToggle(conversation.id, isOpen)}
							onclick={() => { closeAllMenus(); handleConversationClick(conversation.id); }}
							ondelete={() => handleDeleteConversation(conversation.id)}
							onpin={() => handlePinConversation(conversation.id)}
							onrename={(title) => handleRenameConversation(conversation.id, title)}
							onexport={() => handleExportConversation(conversation.id)}
							onFocusTask={handleFocusTask}
						/>
					{/each}
				</div>

				<!-- Divider between pinned and current -->
				{#if hasCurrentResults}
					<div class="section-divider"></div>
				{/if}
			{/if}

			<!-- Current Context Section -->
			{#if hasCurrentResults}
				{#if hasPinnedResults}
					<div class="section-header mt-1">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Recent</span>
					</div>
				{/if}
				{#each filteredCurrent as conversation (conversation.id)}
					<ConversationItem
						{conversation}
						active={conversation.id === chatStore.activeConversationId}
						menuOpen={openMenuId === conversation.id}
						onMenuToggle={(isOpen) => handleMenuToggle(conversation.id, isOpen)}
						onclick={() => { closeAllMenus(); handleConversationClick(conversation.id); }}
						ondelete={() => handleDeleteConversation(conversation.id)}
						onpin={() => handlePinConversation(conversation.id)}
						onrename={(title) => handleRenameConversation(conversation.id, title)}
						onexport={() => handleExportConversation(conversation.id)}
						onFocusTask={handleFocusTask}
					/>
				{/each}
			{/if}

			<!-- From Other Areas Section (collapsible) - Only shown in Area view -->
			{#if hasOtherInSpace}
				<div class="section-divider"></div>
				<button
					type="button"
					class="section-header section-header-collapsible"
					onclick={() => (otherAreasExpanded = !otherAreasExpanded)}
				>
					<svg
						class="w-3.5 h-3.5 transform transition-transform duration-200"
						class:rotate-90={otherAreasExpanded}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
					<span>From Other Areas</span>
					<span class="section-count">{filteredOtherInSpace.length}</span>
				</button>
				{#if otherAreasExpanded}
					<div transition:slide={{ duration: 200 }}>
						{#each filteredOtherInSpace as conversation (conversation.id)}
							<ConversationItem
								{conversation}
								active={conversation.id === chatStore.activeConversationId}
								menuOpen={openMenuId === conversation.id}
								onMenuToggle={(isOpen) => handleMenuToggle(conversation.id, isOpen)}
								onclick={() => { closeAllMenus(); handleConversationClick(conversation.id); }}
								ondelete={() => handleDeleteConversation(conversation.id)}
								onpin={() => handlePinConversation(conversation.id)}
								onrename={(title) => handleRenameConversation(conversation.id, title)}
								onexport={() => handleExportConversation(conversation.id)}
								onFocusTask={handleFocusTask}
							/>
						{/each}
					</div>
				{/if}
			{/if}

			<!-- From Other Spaces Section (collapsible) - Shown in Area/Main view -->
			{#if hasOtherContexts}
				<div class="section-divider"></div>
				<button
					type="button"
					class="section-header section-header-collapsible"
					onclick={() => (otherContextsExpanded = !otherContextsExpanded)}
				>
					<svg
						class="w-3.5 h-3.5 transform transition-transform duration-200"
						class:rotate-90={otherContextsExpanded}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
					</svg>
					<span>{isInAreaView ? 'From Other Spaces' : 'From Spaces'}</span>
					<span class="section-count">{filteredOtherContexts.length}</span>
				</button>
				{#if otherContextsExpanded}
					<div transition:slide={{ duration: 200 }}>
						{#each filteredOtherContexts as conversation (conversation.id)}
							<ConversationItem
								{conversation}
								active={conversation.id === chatStore.activeConversationId}
								menuOpen={openMenuId === conversation.id}
								onMenuToggle={(isOpen) => handleMenuToggle(conversation.id, isOpen)}
								onclick={() => { closeAllMenus(); handleConversationClick(conversation.id); }}
								ondelete={() => handleDeleteConversation(conversation.id)}
								onpin={() => handlePinConversation(conversation.id)}
								onrename={(title) => handleRenameConversation(conversation.id, title)}
								onexport={() => handleExportConversation(conversation.id)}
								onFocusTask={handleFocusTask}
							/>
						{/each}
					</div>
				{/if}
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
