<!--
	SpaceConversationsDrawer.svelte

	Space-level conversations panel showing all conversations across all areas.
	Opens from the left side for familiar sidebar UX.

	Features:
	- View all conversations from all areas in a space
	- Group conversations by area (collapsible)
	- Search across all conversations
	- Navigate to area when clicking a conversation
	- New Chat button with area selection
-->
<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import type { Conversation } from '$lib/types/chat';
	import type { Area } from '$lib/types/areas';
	import type { Space } from '$lib/types/spaces';

	interface Props {
		open: boolean;
		space: Space;
		areas: Area[];
		conversations: Conversation[]; // ALL conversations in space
		onClose: () => void;
		onSelectConversation: (conversation: Conversation) => void;
		onNewChat: () => void;
		onPinConversation?: (id: string, pinned: boolean) => void;
		onRenameConversation?: (id: string, newTitle: string) => void;
		onExportConversation?: (id: string) => void;
		onDeleteConversation?: (id: string) => void;
	}

	let {
		open,
		space,
		areas,
		conversations,
		onClose,
		onSelectConversation,
		onNewChat,
		onPinConversation,
		onRenameConversation,
		onExportConversation,
		onDeleteConversation
	}: Props = $props();

	// Search state
	let searchQuery = $state('');

	// Collapsible state for each area (default: all collapsed)
	let expandedAreas = $state<Set<string>>(new Set());

	// Menu state
	let activeMenuId = $state<string | null>(null);

	// Rename state
	let renamingId = $state<string | null>(null);
	let renameValue = $state('');

	// Group conversations by area
	let conversationsByArea = $derived.by(() => {
		const grouped = new Map<string, Conversation[]>();

		conversations.forEach(conv => {
			if (!conv.areaId) return;
			if (!grouped.has(conv.areaId)) {
				grouped.set(conv.areaId, []);
			}
			grouped.get(conv.areaId)!.push(conv);
		});

		// Sort conversations within each area by updatedAt (most recent first)
		grouped.forEach((convs) => {
			convs.sort((a, b) => b.updatedAt - a.updatedAt);
		});

		return grouped;
	});

	// Filter by search query
	let filteredConversations = $derived.by(() => {
		if (!searchQuery.trim()) return conversations;
		const query = searchQuery.toLowerCase();
		return conversations.filter(conv => {
			if (conv.title?.toLowerCase().includes(query)) return true;
			return conv.messages.some(m => m.content.toLowerCase().includes(query));
		});
	});

	// Get filtered conversations by area
	let filteredConversationsByArea = $derived.by(() => {
		const grouped = new Map<string, Conversation[]>();

		filteredConversations.forEach(conv => {
			if (!conv.areaId) return;
			if (!grouped.has(conv.areaId)) {
				grouped.set(conv.areaId, []);
			}
			grouped.get(conv.areaId)!.push(conv);
		});

		// Sort conversations within each area by updatedAt (most recent first)
		grouped.forEach((convs) => {
			convs.sort((a, b) => b.updatedAt - a.updatedAt);
		});

		return grouped;
	});

	// Total count per area
	function getAreaConversationCount(areaId: string): number {
		return conversationsByArea.get(areaId)?.length ?? 0;
	}

	// Toggle area expansion
	function toggleArea(areaId: string) {
		if (expandedAreas.has(areaId)) {
			expandedAreas.delete(areaId);
		} else {
			expandedAreas.add(areaId);
		}
		expandedAreas = new Set(expandedAreas); // Trigger reactivity
	}

	// Handle conversation click
	function handleConversationClick(conv: Conversation) {
		onSelectConversation(conv);
		onClose();
	}

	// Get conversation preview
	function getPreview(conv: Conversation): string {
		if (conv.title) return conv.title;
		const firstMsg = conv.messages.find(m => m.role === 'user');
		if (!firstMsg) return 'New conversation';
		return firstMsg.content.slice(0, 60) + (firstMsg.content.length > 60 ? '...' : '');
	}

	// Format relative time
	function formatRelativeTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m`;
		if (hours < 24) return `${hours}h`;
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days}d`;
		return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (activeMenuId) {
				activeMenuId = null;
			} else if (renamingId) {
				renamingId = null;
				renameValue = '';
			} else {
				onClose();
			}
		}
	}

	// Toggle menu
	function toggleMenu(e: MouseEvent, convId: string) {
		e.stopPropagation();
		activeMenuId = activeMenuId === convId ? null : convId;
	}

	// Toggle pin
	function handleTogglePin(e: MouseEvent, conv: Conversation) {
		e.stopPropagation();
		activeMenuId = null;
		onPinConversation?.(conv.id, !conv.pinned);
	}

	// Start renaming
	function handleStartRename(e: MouseEvent, conv: Conversation) {
		e.stopPropagation();
		activeMenuId = null;
		renamingId = conv.id;
		renameValue = conv.title || getPreview(conv);
	}

	// Save rename
	function handleSaveRename(e: MouseEvent | KeyboardEvent) {
		e.stopPropagation();
		if (renamingId && renameValue.trim()) {
			onRenameConversation?.(renamingId, renameValue.trim());
		}
		renamingId = null;
		renameValue = '';
	}

	// Cancel rename
	function handleCancelRename(e: MouseEvent | KeyboardEvent) {
		e.stopPropagation();
		renamingId = null;
		renameValue = '';
	}

	// Export conversation
	function handleExport(e: MouseEvent, convId: string) {
		e.stopPropagation();
		activeMenuId = null;
		onExportConversation?.(convId);
	}

	// Delete conversation
	function handleDelete(e: MouseEvent, convId: string) {
		e.stopPropagation();
		activeMenuId = null;
		onDeleteConversation?.(convId);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
		transition:fade={{ duration: 150 }}
		onclick={onClose}
		role="presentation"
	></div>

	<!-- Drawer -->
	<div
		class="fixed top-0 left-0 h-full w-full sm:w-80 bg-surface-900 dark:bg-surface-900 border-r border-surface-700 dark:border-surface-700 z-50 flex flex-col shadow-2xl"
		transition:fly={{ x: -320, duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-label="Space Conversations"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b border-surface-700 dark:border-surface-700">
			<div>
				<h2 class="text-sm font-semibold text-surface-100 dark:text-surface-100">Conversations</h2>
				<p class="text-xs text-surface-400 dark:text-surface-400">{space.name}</p>
			</div>
			<button
				type="button"
				class="p-1.5 rounded-lg text-surface-400 dark:text-surface-400 hover:text-surface-200 dark:hover:text-surface-200 hover:bg-surface-700 dark:hover:bg-surface-700 transition-colors"
				onclick={onClose}
				aria-label="Close conversations panel"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Search Bar -->
		<div class="px-3 py-2 border-b border-surface-700/50 dark:border-surface-700/50">
			<div class="relative">
				<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 dark:text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search conversations..."
					class="w-full pl-9 pr-3 py-2 text-sm bg-surface-800 dark:bg-surface-800 border border-surface-700 dark:border-surface-700 rounded-lg
						   text-surface-100 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-500
						   focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-500"
				/>
			</div>
		</div>

		<!-- New Chat Button -->
		<div class="px-3 py-2">
			<button
				type="button"
				class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
				style="color: {space.color || '#6366f1'}; background: color-mix(in srgb, {space.color || '#6366f1'} 10%, transparent);"
				onclick={() => { onNewChat(); onClose(); }}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				New Chat
			</button>
		</div>

		<!-- Conversations List -->
		<div class="flex-1 overflow-y-auto">
			{#if areas.length === 0}
				<div class="px-4 py-8 text-center">
					<p class="text-sm text-surface-500 dark:text-surface-500">No areas in this space</p>
					<p class="text-xs text-surface-600 dark:text-surface-600 mt-1">Create an area to get started</p>
				</div>
			{:else if searchQuery && filteredConversations.length === 0}
				<div class="px-4 py-8 text-center">
					<p class="text-sm text-surface-500 dark:text-surface-500">No conversations match "{searchQuery}"</p>
				</div>
			{:else}
				{#each areas as area (area.id)}
					{@const areaConvs = filteredConversationsByArea.get(area.id) ?? []}
					<div class="border-b border-surface-800 dark:border-surface-800">
						<!-- Area Header (collapsible) -->
						<button
							type="button"
							onclick={() => toggleArea(area.id)}
							class="w-full flex items-center justify-between px-4 py-3
								   hover:bg-surface-800 dark:hover:bg-surface-800 transition-colors text-left"
						>
							<div class="flex items-center gap-2">
								<div
									class="w-2 h-2 rounded-full flex-shrink-0"
									style="background: {area.color || space.color || '#6b7280'}"
								></div>
								{#if area.icon}
									<span class="text-base">{area.icon}</span>
								{/if}
								<span class="font-medium text-surface-100 dark:text-surface-100">{area.name}</span>
								<span class="text-xs text-surface-500 dark:text-surface-500">({areaConvs.length})</span>
							</div>
							<svg
								class="w-4 h-4 text-surface-400 dark:text-surface-400 transition-transform {expandedAreas.has(area.id) ? 'rotate-90' : ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</button>

						<!-- Conversations in this area -->
						{#if expandedAreas.has(area.id)}
							<div class="pb-2">
								{#if areaConvs.length === 0}
									<!-- Empty state for area with no conversations -->
									<div class="px-4 py-3 text-center">
										<p class="text-xs text-surface-500 dark:text-surface-500">No conversations yet</p>
										<button
											type="button"
											class="mt-2 text-xs text-primary-400 dark:text-primary-400 hover:text-primary-300 dark:hover:text-primary-300"
											onclick={() => goto(`/spaces/${space.slug}/${area.slug}`)}
										>
											Start a chat →
										</button>
									</div>
								{:else}
									{#each areaConvs as conv (conv.id)}
										<div class="relative group">
											<button
												type="button"
												onclick={() => handleConversationClick(conv)}
												class="w-full px-4 py-2 text-left hover:bg-surface-800 dark:hover:bg-surface-800 transition-colors
													   flex items-start gap-2"
											>
												<div class="flex-1 min-w-0 pr-6">
													{#if conv.pinned}
														<div class="flex items-center gap-1.5 mb-0.5">
															<svg class="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
																<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
															</svg>
															<p class="text-sm font-medium text-surface-100 dark:text-surface-100 truncate">
																{getPreview(conv)}
															</p>
														</div>
													{:else}
														<p class="text-sm font-medium text-surface-100 dark:text-surface-100 truncate">
															{getPreview(conv)}
														</p>
													{/if}
													<p class="text-xs text-surface-500 dark:text-surface-500">
														{formatRelativeTime(conv.updatedAt)}
													</p>
												</div>
											</button>

											<!-- Menu button -->
											{#if onPinConversation}
												<button
													type="button"
													class="absolute right-2 top-2 p-1 rounded text-surface-500 hover:text-surface-300 hover:bg-surface-700 opacity-0 group-hover:opacity-100 transition-opacity"
													onclick={(e) => toggleMenu(e, conv.id)}
												>
													<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
														<path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
													</svg>
												</button>

												<!-- Dropdown menu -->
												{#if activeMenuId === conv.id}
													<div
														class="absolute right-2 top-8 w-36 py-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-10"
														transition:fade={{ duration: 100 }}
													>
														<button
															type="button"
															class="w-full px-3 py-1.5 text-left text-xs text-surface-300 hover:bg-surface-700 flex items-center gap-2"
															onclick={(e) => handleStartRename(e, conv)}
														>
															<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
																<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
															</svg>
															Rename
														</button>
														<button
															type="button"
															class="w-full px-3 py-1.5 text-left text-xs text-surface-300 hover:bg-surface-700 flex items-center gap-2"
															onclick={(e) => handleTogglePin(e, conv)}
														>
															{#if conv.pinned}
																<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
																</svg>
																Unpin
															{:else}
																<svg class="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
																	<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
																</svg>
																Pin
															{/if}
														</button>
														<button
															type="button"
															class="w-full px-3 py-1.5 text-left text-xs text-surface-300 hover:bg-surface-700 flex items-center gap-2"
															onclick={(e) => handleExport(e, conv.id)}
														>
															<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
																<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
															</svg>
															Export
														</button>
														<div class="border-t border-surface-700 my-1"></div>
														<button
															type="button"
															class="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
															onclick={(e) => handleDelete(e, conv.id)}
														>
															<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
																<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
															</svg>
															Delete
														</button>
													</div>
												{/if}
											{/if}
										</div>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>

		<!-- Rename input overlay -->
		{#if renamingId}
			<div class="absolute inset-0 bg-black/50 flex items-center justify-center z-20" transition:fade={{ duration: 100 }}>
				<div class="bg-surface-800 border border-surface-700 rounded-lg p-4 mx-4 w-full max-w-sm shadow-xl">
					<h4 class="text-sm font-medium text-surface-100 mb-3">Rename Conversation</h4>
					<input
						type="text"
						bind:value={renameValue}
						class="w-full px-3 py-2 text-sm bg-surface-900 border border-surface-600 rounded-lg
							   text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
						onkeydown={(e) => {
							if (e.key === 'Enter') handleSaveRename(e);
							if (e.key === 'Escape') handleCancelRename(e);
						}}
					/>
					<div class="flex justify-end gap-2 mt-3">
						<button
							type="button"
							class="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 transition-colors"
							onclick={handleCancelRename}
						>
							Cancel
						</button>
						<button
							type="button"
							class="px-3 py-1.5 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
							onclick={handleSaveRename}
						>
							Save
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
