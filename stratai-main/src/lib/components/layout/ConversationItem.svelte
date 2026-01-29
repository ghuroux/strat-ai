<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import type { Conversation } from '$lib/types/chat';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	interface Props {
		conversation: Conversation;
		active?: boolean;
		menuOpen?: boolean;
		onMenuToggle?: (isOpen: boolean) => void;
		onclick?: () => void;
		ondelete?: () => void;
		onpin?: () => void;
		onrename?: (newTitle: string) => void;
		onexport?: () => void;
		onmove?: () => void;
		onFocusTask?: (taskId: string) => void;
	}

	let {
		conversation,
		active = false,
		menuOpen = false,
		onMenuToggle,
		onclick,
		ondelete,
		onpin,
		onrename,
		onexport,
		onmove,
		onFocusTask
	}: Props = $props();

	let isEditing = $state(false);
	let editTitle = $state('');
	let inputRef: HTMLInputElement | undefined = $state();
	let menuButtonRef: HTMLButtonElement | undefined = $state();
	let menuPosition = $state({ top: 0, left: 0 });
	let isPinned = $derived(conversation.pinned ?? false);

	// Get linked task for this conversation
	let linkedTask = $derived(taskStore.getTaskForConversation(conversation.id));

	// Get space color for border indicator (Phase C: Chat Context Awareness)
	let spaceColor = $derived.by(() => {
		if (!conversation.spaceId) return null;
		const space = spacesStore.getSpaceById(conversation.spaceId);
		return space?.color || null;
	});

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

	function getMessagePreview(): string {
		if (!conversation.messages || conversation.messages.length === 0) return 'No messages yet';
		const lastMessage = conversation.messages[conversation.messages.length - 1];
		if (!lastMessage?.content) return 'No messages yet';
		return lastMessage.content.slice(0, 60) + (lastMessage.content.length > 60 ? '...' : '');
	}

	function handleItemClick() {
		if (!isEditing) {
			onclick?.();
		}
	}

	function toggleMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();

		// Calculate position for fixed dropdown
		if (menuButtonRef && !menuOpen) {
			const rect = menuButtonRef.getBoundingClientRect();
			// Position menu to start above the button, so it appears adjacent
			const menuHeight = 160; // Approximate height of dropdown
			const menuWidth = 140; // Width of dropdown menu
			const viewport = window.innerWidth;
			// Check if menu would go off-screen to the right
			const shouldPlaceLeft = rect.right + menuWidth + 8 > viewport;
			menuPosition = {
				top: Math.max(8, rect.top - menuHeight + rect.height),
				left: shouldPlaceLeft ? Math.max(8, rect.left - menuWidth) : rect.right + 8
			};
		}

		onMenuToggle?.(!menuOpen);
	}

	function doRename(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		onMenuToggle?.(false);
		isEditing = true;
		editTitle = conversation.title;
		setTimeout(() => inputRef?.focus(), 0);
	}

	function doPin(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		onMenuToggle?.(false);
		onpin?.();
	}

	function doDelete(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		onMenuToggle?.(false);
		ondelete?.();
	}

	let showExportOptions = $state(false);

	function toggleExportOptions(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		showExportOptions = !showExportOptions;
	}

	function exportAs(format: 'markdown' | 'json' | 'plaintext', e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		try {
			window.location.href = `/api/conversations/export/${conversation.id}?format=${format}`;
		} catch {
			toastStore.error('Failed to export conversation');
		}
		showExportOptions = false;
		onMenuToggle?.(false);
	}

	function doMove(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		onMenuToggle?.(false);
		onmove?.();
	}

	function handleMenuMouseLeave() {
		// Close menu when mouse leaves the dropdown
		showExportOptions = false;
		onMenuToggle?.(false);
	}

	function submitRename() {
		const trimmed = editTitle.trim();
		if (trimmed && trimmed !== conversation.title) {
			onrename?.(trimmed);
		}
		isEditing = false;
	}

	function handleInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			submitRename();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			isEditing = false;
		}
	}

	function handleTaskPillClick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (linkedTask) {
			onFocusTask?.(linkedTask.id);
		}
	}
</script>

<div
	class="conversation-item {active ? 'active' : ''} {spaceColor ? 'has-space-indicator' : ''}"
	role="button"
	tabindex="0"
	onclick={handleItemClick}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleItemClick()}
	in:fly={{ x: -20, duration: 200 }}
	style:--space-indicator-color={spaceColor || 'transparent'}
>
	<!-- Content -->
	<div class="item-content">
		{#if isEditing}
			<input
				bind:this={inputRef}
				type="text"
				bind:value={editTitle}
				onkeydown={handleInputKeydown}
				onblur={submitRename}
				onclick={(e) => e.stopPropagation()}
				class="rename-input"
				placeholder="Chat title..."
			/>
		{:else}
			<div class="item-header">
				<span class="item-title">{conversation.title}</span>
				<span class="item-time">{formatTime(conversation.updatedAt)}</span>
			</div>
			<p class="item-preview">{getMessagePreview()}</p>
			{#if linkedTask}
				<button
					type="button"
					class="task-pill"
					style="background: color-mix(in srgb, {linkedTask.color} 20%, transparent); color: {linkedTask.color};"
					onclick={handleTaskPillClick}
					title="Focus on: {linkedTask.title}"
				>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					<span class="task-pill-text">{linkedTask.title}</span>
				</button>
			{/if}
		{/if}
	</div>

	<!-- Pin indicator (when not hovering) -->
	{#if isPinned}
		<div class="pin-indicator">
			<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
				<path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
			</svg>
		</div>
	{/if}

	<!-- Menu trigger button -->
	<button
		bind:this={menuButtonRef}
		type="button"
		class="menu-trigger"
		onclick={toggleMenu}
		aria-label="More options"
		aria-haspopup="true"
		aria-expanded={menuOpen}
	>
		<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
			<circle cx="12" cy="5" r="2" />
			<circle cx="12" cy="12" r="2" />
			<circle cx="12" cy="19" r="2" />
		</svg>
	</button>

	<!-- Dropdown menu (fixed position to escape sidebar overflow) -->
	{#if menuOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="dropdown-menu"
			style="top: {menuPosition.top}px; left: {menuPosition.left}px;"
			onmouseleave={handleMenuMouseLeave}
			transition:fade={{ duration: 100 }}
		>
			<button type="button" class="dropdown-item" onclick={doRename}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
				</svg>
				Rename
			</button>
			<button type="button" class="dropdown-item" onclick={doPin}>
				<svg class="w-4 h-4" viewBox="0 0 24 24">
					{#if isPinned}
						<path fill="currentColor" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
					{:else}
						<path stroke="currentColor" stroke-width="2" fill="none" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
					{/if}
				</svg>
				{isPinned ? 'Unpin' : 'Pin'}
			</button>
			<button type="button" class="dropdown-item export-trigger" onclick={toggleExportOptions}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				Export
				<svg class="expand-chevron" class:expanded={showExportOptions} viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
				</svg>
			</button>
			{#if showExportOptions}
				<div class="export-submenu">
					<button type="button" class="dropdown-item export-option" onclick={(e) => exportAs('markdown', e)}>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						Markdown
					</button>
					<button type="button" class="dropdown-item export-option" onclick={(e) => exportAs('json', e)}>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
						</svg>
						JSON
					</button>
					<button type="button" class="dropdown-item export-option" onclick={(e) => exportAs('plaintext', e)}>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
						</svg>
						Plain Text
					</button>
				</div>
			{/if}
			<button type="button" class="dropdown-item" onclick={doMove}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
				</svg>
				Move Chat...
			</button>
			<div class="dropdown-divider"></div>
			<button type="button" class="dropdown-item dropdown-item-danger" onclick={doDelete}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
				Delete
			</button>
		</div>
	{/if}
</div>

<style>
	.conversation-item {
		position: relative;
		display: flex;
		align-items: center;
		padding: 0.75rem 1rem;
		margin: 0 0.5rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background-color 0.15s ease, border-color 0.15s ease;
		/* Space indicator border */
		border-left: 3px solid transparent;
	}

	.conversation-item.has-space-indicator {
		border-left-color: var(--space-indicator-color);
	}

	.conversation-item:hover {
		background-color: rgba(255, 255, 255, 0.05);
	}

	.conversation-item.active {
		background-color: rgba(99, 102, 241, 0.15);
	}

	.item-content {
		flex: 1;
		min-width: 0;
		padding-right: 0rem;
	}

	.item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.item-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: #e4e4e7;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-time {
		font-size: 0.75rem;
		color: #71717a;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.item-preview {
		font-size: 0.75rem;
		color: #71717a;
		margin-top: 0.125rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.rename-input {
		width: 100%;
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		background-color: #27272a;
		border: 1px solid #6366f1;
		border-radius: 0.25rem;
		color: #e4e4e7;
		outline: none;
	}

	.rename-input:focus {
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
	}

	.pin-indicator {
		position: absolute;
		right: 1.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: #fbbf24;
		opacity: 1;
		transition: opacity 0.15s ease;
	}

	.conversation-item:hover .pin-indicator {
		opacity: 0;
	}

	.menu-trigger {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		padding: 0.375rem;
		border-radius: 0.375rem;
		color: #71717a;
		background: transparent;
		border: none;
		cursor: pointer;
		opacity: 0;
		transition: all 0.15s ease;
	}

	.conversation-item:hover .menu-trigger,
	.menu-trigger[aria-expanded="true"] {
		opacity: 1;
	}

	.menu-trigger:hover {
		background-color: #3f3f46;
		color: #e4e4e7;
	}

	.dropdown-menu {
		position: fixed;
		width: 160px;
		padding: 0.25rem 0;
		background-color: #18181b;
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
		z-index: 9999;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		color: #e4e4e7;
		background: none;
		border: none;
		cursor: pointer;
		transition: background-color 0.1s ease;
		text-align: left;
	}

	.dropdown-item:hover {
		background-color: #27272a;
	}

	.dropdown-item-danger {
		color: #f87171;
	}

	.dropdown-item-danger:hover {
		background-color: rgba(248, 113, 113, 0.1);
	}

	.export-trigger {
		justify-content: flex-start;
	}

	.expand-chevron {
		width: 0.75rem;
		height: 0.75rem;
		margin-left: auto;
		transition: transform 0.15s ease;
		opacity: 0.5;
	}

	.expand-chevron.expanded {
		transform: rotate(180deg);
	}

	.export-submenu {
		border-top: 1px solid #3f3f46;
		padding: 0.125rem 0;
		background: rgba(255, 255, 255, 0.02);
	}

	.export-option {
		padding-left: 1.5rem;
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	.export-option:hover {
		color: #e4e4e7;
	}

	.dropdown-divider {
		height: 1px;
		margin: 0.25rem 0;
		background-color: #3f3f46;
	}

	.task-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.375rem;
		padding: 0.125rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		border-radius: 9999px;
		border: none;
		cursor: pointer;
		transition: all 0.15s ease;
		max-width: 100%;
	}

	.task-pill:hover {
		filter: brightness(1.2);
	}

	.task-pill-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 140px;
	}
</style>
