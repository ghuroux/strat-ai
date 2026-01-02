<!--
	ConversationDrawer.svelte

	Slide-out drawer showing all conversations in an area.
	Opens from the left side for familiar sidebar UX.

	Features:
	- Pin/unpin conversations
	- Show conversations from other areas (with move-to functionality)
	- Task badge for task-related conversations
-->
<script lang="ts">
	import { fly, fade, slide } from 'svelte/transition';
	import type { Conversation } from '$lib/types/chat';
	import type { Area } from '$lib/types/areas';

	interface TaskInfo {
		id: string;
		title: string;
		color?: string;
	}

	interface Props {
		open: boolean;
		area: Area;
		allAreas?: Area[]; // All areas in space for lookup
		conversations: Conversation[];
		otherAreaConversations?: Conversation[]; // Conversations from other areas in same space
		activeConversationId: string | null;
		getTaskInfo?: (taskId: string) => TaskInfo | null;
		onClose: () => void;
		onSelectConversation: (id: string) => void;
		onNewChat: () => void;
		onPinConversation?: (id: string, pinned: boolean) => void;
		onMoveToArea?: (conversationId: string) => void;
	}

	let {
		open,
		area,
		allAreas = [],
		conversations,
		otherAreaConversations = [],
		activeConversationId,
		getTaskInfo,
		onClose,
		onSelectConversation,
		onNewChat,
		onPinConversation,
		onMoveToArea
	}: Props = $props();

	// Search/filter state
	let searchQuery = $state('');

	// Collapsible state for "other areas" section
	let otherAreasExpanded = $state(false);

	// Active menu state
	let activeMenuId = $state<string | null>(null);

	// Filtered conversations
	let filteredConversations = $derived.by(() => {
		if (!searchQuery.trim()) return conversations;
		const query = searchQuery.toLowerCase();
		return conversations.filter(conv => {
			if (conv.title?.toLowerCase().includes(query)) return true;
			return conv.messages.some(m => m.content.toLowerCase().includes(query));
		});
	});

	// Filtered other area conversations
	let filteredOtherConversations = $derived.by(() => {
		if (!searchQuery.trim()) return otherAreaConversations;
		const query = searchQuery.toLowerCase();
		return otherAreaConversations.filter(conv => {
			if (conv.title?.toLowerCase().includes(query)) return true;
			return conv.messages.some(m => m.content.toLowerCase().includes(query));
		});
	});

	// Group by pinned and recent
	let pinnedConversations = $derived(filteredConversations.filter(c => c.pinned));
	let recentConversations = $derived(filteredConversations.filter(c => !c.pinned));

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

	// Get conversation preview
	function getPreview(conv: Conversation): string {
		if (conv.title) return conv.title;
		const firstMsg = conv.messages.find(m => m.role === 'user');
		if (!firstMsg) return 'New conversation';
		return firstMsg.content.slice(0, 60) + (firstMsg.content.length > 60 ? '...' : '');
	}

	// Get area by ID
	function getAreaById(areaId: string | null | undefined): Area | null {
		if (!areaId) return null;
		return allAreas.find(a => a.id === areaId) ?? null;
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (activeMenuId) {
				activeMenuId = null;
			} else {
				onClose();
			}
		}
	}

	// Handle conversation click
	function handleSelect(id: string) {
		onSelectConversation(id);
		onClose();
	}

	// Toggle pin
	function handleTogglePin(e: MouseEvent, conv: Conversation) {
		e.stopPropagation();
		activeMenuId = null;
		onPinConversation?.(conv.id, !conv.pinned);
	}

	// Move to current area
	function handleMoveToArea(e: MouseEvent, convId: string) {
		e.stopPropagation();
		activeMenuId = null;
		onMoveToArea?.(convId);
	}

	// Toggle menu
	function toggleMenu(e: MouseEvent, convId: string) {
		e.stopPropagation();
		activeMenuId = activeMenuId === convId ? null : convId;
	}

	// Close menu when clicking outside
	function handleBackdropClick() {
		if (activeMenuId) {
			activeMenuId = null;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
		transition:fade={{ duration: 150 }}
		onclick={() => { handleBackdropClick(); onClose(); }}
		role="presentation"
	></div>

	<!-- Drawer -->
	<div
		class="fixed top-0 left-0 h-full w-80 bg-surface-900 border-r border-surface-700 z-50 flex flex-col shadow-2xl"
		transition:fly={{ x: -320, duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-label="Conversations"
		onclick={handleBackdropClick}
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b border-surface-700">
			<div class="flex items-center gap-2">
				{#if area.icon}
					<span class="text-lg">{area.icon}</span>
				{/if}
				<div>
					<h2 class="text-sm font-semibold text-surface-100">Conversations</h2>
					<p class="text-xs text-surface-500">{conversations.length} in {area.name}</p>
				</div>
			</div>
			<button
				type="button"
				class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
				onclick={onClose}
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Search -->
		<div class="px-3 py-2 border-b border-surface-700/50">
			<div class="relative">
				<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search conversations..."
					class="w-full pl-9 pr-3 py-2 text-sm bg-surface-800 border border-surface-700 rounded-lg
						   text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
				/>
			</div>
		</div>

		<!-- New Chat Button -->
		<div class="px-3 py-2">
			<button
				type="button"
				class="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
				style="color: {area.color || 'var(--space-accent)'}; background: color-mix(in srgb, {area.color || 'var(--space-accent)'} 10%, transparent);"
				onclick={() => { onNewChat(); onClose(); }}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				New Chat
			</button>
		</div>

		<!-- Conversation List -->
		<div class="flex-1 overflow-y-auto">
			{#if filteredConversations.length === 0 && filteredOtherConversations.length === 0}
				<div class="px-4 py-8 text-center">
					{#if searchQuery}
						<p class="text-sm text-surface-500">No conversations match "{searchQuery}"</p>
					{:else}
						<p class="text-sm text-surface-500">No conversations yet</p>
						<p class="text-xs text-surface-600 mt-1">Start a chat to get going</p>
					{/if}
				</div>
			{:else}
				<!-- Pinned Section -->
				{#if pinnedConversations.length > 0}
					<div class="px-3 pt-2">
						<h3 class="px-2 py-1 text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
							Pinned
						</h3>
						<div class="space-y-0.5">
							{#each pinnedConversations as conv (conv.id)}
								{@const taskInfo = conv.taskId && getTaskInfo ? getTaskInfo(conv.taskId) : null}
								<div class="relative group">
									<button
										type="button"
										class="w-full px-3 py-2 text-left rounded-lg transition-colors
											   {activeConversationId === conv.id
												? 'bg-primary-500/15 text-primary-400'
												: 'hover:bg-surface-800 text-surface-300 hover:text-surface-100'}"
										onclick={() => handleSelect(conv.id)}
									>
										<div class="flex items-start gap-2">
											<svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
												<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
											</svg>
											<div class="flex-1 min-w-0">
												<p class="text-sm truncate pr-6">{getPreview(conv)}</p>
												<div class="flex items-center gap-2 mt-0.5">
													<span class="text-xs text-surface-500">{formatRelativeTime(conv.updatedAt)}</span>
													{#if taskInfo}
														<span
															class="text-[10px] px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]"
															style="color: {taskInfo.color || '#3b82f6'}; background: color-mix(in srgb, {taskInfo.color || '#3b82f6'} 15%, transparent);"
															title={taskInfo.title}
														>
															{taskInfo.title}
														</span>
													{/if}
												</div>
											</div>
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
													onclick={(e) => handleTogglePin(e, conv)}
												>
													<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
													</svg>
													Unpin
												</button>
											</div>
										{/if}
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Recent Section -->
				{#if recentConversations.length > 0}
					<div class="px-3 pt-2 pb-2">
						<h3 class="px-2 py-1 text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
							{pinnedConversations.length > 0 ? 'Recent' : 'All Conversations'}
						</h3>
						<div class="space-y-0.5">
							{#each recentConversations as conv (conv.id)}
								{@const taskInfo = conv.taskId && getTaskInfo ? getTaskInfo(conv.taskId) : null}
								<div class="relative group">
									<button
										type="button"
										class="w-full px-3 py-2 text-left rounded-lg transition-colors
											   {activeConversationId === conv.id
												? 'bg-primary-500/15 text-primary-400'
												: 'hover:bg-surface-800 text-surface-300 hover:text-surface-100'}"
										onclick={() => handleSelect(conv.id)}
									>
										<div class="flex-1 min-w-0">
											<div class="flex items-center justify-between gap-2">
												<p class="text-sm truncate flex-1 pr-6">{getPreview(conv)}</p>
												<span class="text-xs text-surface-500 flex-shrink-0">{formatRelativeTime(conv.updatedAt)}</span>
											</div>
											{#if taskInfo}
												<div class="mt-1">
													<span
														class="text-[10px] px-1.5 py-0.5 rounded font-medium truncate inline-block max-w-[180px]"
														style="color: {taskInfo.color || '#3b82f6'}; background: color-mix(in srgb, {taskInfo.color || '#3b82f6'} 15%, transparent);"
														title={taskInfo.title}
													>
														{taskInfo.title}
													</span>
												</div>
											{/if}
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
													onclick={(e) => handleTogglePin(e, conv)}
												>
													<svg class="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
														<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
													</svg>
													Pin
												</button>
											</div>
										{/if}
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- From Other Areas Section -->
				{#if filteredOtherConversations.length > 0}
					<div class="px-3 pt-2 pb-4 border-t border-surface-700/50 mt-2">
						<button
							type="button"
							class="w-full px-2 py-1 text-left flex items-center gap-2 text-[10px] font-semibold text-surface-500 uppercase tracking-wider hover:text-surface-400 transition-colors"
							onclick={() => otherAreasExpanded = !otherAreasExpanded}
						>
							<svg
								class="w-3 h-3 transition-transform"
								class:rotate-90={otherAreasExpanded}
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
							</svg>
							From Other Areas
							<span class="ml-auto text-surface-600">{filteredOtherConversations.length}</span>
						</button>

						{#if otherAreasExpanded}
							<div class="space-y-0.5 mt-1" transition:slide={{ duration: 150 }}>
								{#each filteredOtherConversations as conv (conv.id)}
									{@const convArea = getAreaById(conv.areaId)}
									{@const taskInfo = conv.taskId && getTaskInfo ? getTaskInfo(conv.taskId) : null}
									<div class="relative group">
										<button
											type="button"
											class="w-full px-3 py-2 text-left rounded-lg transition-colors hover:bg-surface-800 text-surface-400 hover:text-surface-200"
											onclick={() => handleSelect(conv.id)}
										>
											<div class="flex-1 min-w-0">
												<p class="text-sm truncate pr-6">{getPreview(conv)}</p>
												<div class="flex items-center gap-2 mt-1 flex-wrap">
													{#if convArea}
														<span
															class="text-[10px] px-1.5 py-0.5 rounded font-medium"
															style="color: {convArea.color || '#6b7280'}; background: color-mix(in srgb, {convArea.color || '#6b7280'} 15%, transparent);"
														>
															{convArea.icon || ''} {convArea.name}
														</span>
													{/if}
													{#if taskInfo}
														<span
															class="text-[10px] px-1.5 py-0.5 rounded font-medium truncate max-w-[100px]"
															style="color: {taskInfo.color || '#3b82f6'}; background: color-mix(in srgb, {taskInfo.color || '#3b82f6'} 15%, transparent);"
															title={taskInfo.title}
														>
															{taskInfo.title}
														</span>
													{/if}
													<span class="text-xs text-surface-600">{formatRelativeTime(conv.updatedAt)}</span>
												</div>
											</div>
										</button>

										<!-- Menu button with move option -->
										{#if onMoveToArea}
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
													class="absolute right-2 top-8 w-44 py-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-10"
													transition:fade={{ duration: 100 }}
												>
													<button
														type="button"
														class="w-full px-3 py-1.5 text-left text-xs text-surface-300 hover:bg-surface-700 flex items-center gap-2"
														onclick={(e) => handleMoveToArea(e, conv.id)}
													>
														<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
														</svg>
														Move to {area.name}
													</button>
												</div>
											{/if}
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}
