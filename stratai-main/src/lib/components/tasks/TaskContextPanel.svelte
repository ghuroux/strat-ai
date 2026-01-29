<script lang="ts">
	/**
	 * TaskContextPanel - Collapsible side panel for task context and conversations
	 *
	 * Supports two modes:
	 * 1. Subtask mode: Shows rich context from Plan Mode, parent task info
	 * 2. Work unit mode: Shows task details, description, "Help me plan" action
	 *
	 * Both modes show:
	 * - Conversation list with cards
	 * - New Chat button
	 * - Quick Start actions
	 *
	 * Collapsible to slim sidebar when user is focused on chat.
	 */
	import { slide, fly, fade } from 'svelte/transition';
	import type { Task, SubtaskContext } from '$lib/types/tasks';
	import type { Conversation } from '$lib/types/chat';
	import { getQuickStarts, type QuickStartIcon } from '$lib/utils/quick-starts';
	import { MoreVertical, Edit3, Star, Download, Trash2, FileText, FileCode, FileDown, ChevronDown } from 'lucide-svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	// SVG icon paths for quick start icons
	const ICON_PATHS: Record<QuickStartIcon, string> = {
		checklist: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
		search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
		chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
		target: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
		calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
		warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		question: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		magnifier: 'M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z',
		document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
		ruler: 'M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5',
		puzzle: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
		microscope: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
		lightbulb: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
		users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
		sparkle: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
		bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
		rocket: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z'
	};

	interface Props {
		// For subtask mode
		subtask?: Task;
		parentTask?: Task;
		// For work unit mode
		task?: Task;
		isWorkUnit?: boolean;
		isPlanningMode?: boolean;
		onStartPlanMode?: () => void;
		onCancelPlanMode?: () => void;
		// Common props
		conversations: Conversation[];
		activeConversationId: string | null;
		collapsed: boolean;
		isCompleted?: boolean;
		onSelectConversation: (id: string) => void;
		onNewChat: () => void;
		onToggleCollapse: () => void;
		onQuickAction: (action: string) => void;
		// Conversation action callbacks (optional - for context menu)
		onDeleteConversation?: (id: string) => void;
		onRenameConversation?: (id: string, newTitle: string) => void;
		onPinConversation?: (id: string) => void;
		onExportConversation?: (id: string) => void;
	}

	let {
		subtask,
		parentTask,
		task,
		isWorkUnit = false,
		isPlanningMode = false,
		onStartPlanMode,
		onCancelPlanMode,
		conversations,
		activeConversationId,
		collapsed,
		isCompleted = false,
		onSelectConversation,
		onNewChat,
		onToggleCollapse,
		onQuickAction,
		onDeleteConversation,
		onRenameConversation,
		onPinConversation,
		onExportConversation
	}: Props = $props();

	// Check if conversation actions are enabled
	let hasConversationActions = $derived(
		!!onDeleteConversation || !!onRenameConversation || !!onPinConversation || !!onExportConversation
	);

	// Context menu state
	let openMenuId = $state<string | null>(null);
	let menuPosition = $state({ top: 0, left: 0 });
	let showExportOptions = $state(false);

	function exportAs(format: 'markdown' | 'json' | 'plaintext', conversationId: string) {
		try {
			window.location.href = `/api/conversations/export/${conversationId}?format=${format}`;
		} catch {
			toastStore.error('Failed to export conversation');
		}
		showExportOptions = false;
		openMenuId = null;
	}

	// Rename state
	let renamingConversationId = $state<string | null>(null);
	let renameValue = $state('');
	let renameInputRef: HTMLInputElement | undefined = $state();

	function toggleMenu(e: MouseEvent, conversationId: string) {
		e.preventDefault();
		e.stopPropagation();

		if (openMenuId === conversationId) {
			openMenuId = null;
			return;
		}

		// Calculate position
		const button = e.currentTarget as HTMLButtonElement;
		const rect = button.getBoundingClientRect();
		const menuHeight = 180;
		const menuWidth = 140;

		// Position below the button, aligned to right edge
		menuPosition = {
			top: rect.bottom + 4,
			left: Math.max(8, rect.right - menuWidth)
		};

		openMenuId = conversationId;
	}

	function closeMenu() {
		showExportOptions = false;
		openMenuId = null;
	}

	function handleMenuAction(action: () => void) {
		action();
		closeMenu();
	}

	function startRename(conv: Conversation) {
		renamingConversationId = conv.id;
		renameValue = conv.title || '';
		closeMenu();
		// Focus input after DOM update
		setTimeout(() => renameInputRef?.focus(), 0);
	}

	function submitRename() {
		if (renamingConversationId && renameValue.trim() && onRenameConversation) {
			onRenameConversation(renamingConversationId, renameValue.trim());
		}
		cancelRename();
	}

	function cancelRename() {
		renamingConversationId = null;
		renameValue = '';
	}

	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			submitRename();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelRename();
		}
	}

	// Check if a conversation is pinned
	function isPinned(conv: Conversation): boolean {
		return conv.pinned ?? false;
	}

	// Derive the actual task to work with
	let displayTask = $derived(isWorkUnit ? task : subtask);

	// Parse rich context from subtask.contextSummary (subtask mode only)
	let richContext = $derived.by((): SubtaskContext | null => {
		if (!subtask?.contextSummary) return null;
		try {
			return JSON.parse(subtask.contextSummary) as SubtaskContext;
		} catch {
			return null;
		}
	});

	let hasRichContext = $derived(richContext !== null);

	// Contextual quick starts based on task type and context
	let quickStarts = $derived(
		displayTask
			? getQuickStarts({
					title: displayTask.title,
					description: displayTask.description,
					parentTaskTitle: parentTask?.title,
					isSubtask: !isWorkUnit,
					richContext: displayTask.contextSummary
				})
			: []
	);

	// Format due date for display
	function formatDueDate(date: Date): string {
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

		if (dateOnly.getTime() === todayOnly.getTime()) return 'Today';
		if (dateOnly.getTime() === tomorrowOnly.getTime()) return 'Tomorrow';
		if (dateOnly < todayOnly) return 'Overdue';

		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	// Format estimated effort
	function formatEffort(effort: string): string {
		const labels: Record<string, string> = {
			quick: '< 15 min',
			short: '< 1 hour',
			medium: '1-4 hours',
			long: '4+ hours',
			multi_day: 'Multi-day'
		};
		return labels[effort] || effort;
	}

	// Context section expand/collapse state
	let contextExpanded = $state(false);

	// Format relative time
	function formatRelativeTime(timestamp: number): string {
		const now = Date.now();
		const diffMs = now - timestamp;
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m`;
		if (diffHours < 24) return `${diffHours}h`;
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays}d`;
		return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	// Get conversation preview (first user message or title)
	function getConversationPreview(conv: Conversation): string {
		if (conv.title && conv.title !== 'New Chat') return conv.title;
		const firstUserMsg = conv.messages.find((m) => m.role === 'user');
		if (firstUserMsg) {
			return firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
		}
		return 'New conversation';
	}

	// Handle quick start click - sends full contextual prompt
	function handleQuickStart(prompt: string, label: string) {
		const event = new CustomEvent('prepopulate-input', {
			detail: { text: prompt },
			bubbles: true
		});
		document.dispatchEvent(event);
		onQuickAction(label);
	}
</script>

{#if collapsed}
	<!-- Collapsed state: slim vertical bar -->
	<button
		type="button"
		class="collapsed-panel"
		onclick={onToggleCollapse}
		title="Expand context panel"
		transition:fly={{ x: -20, duration: 200 }}
	>
		<div class="collapsed-indicator">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 5l7 7-7 7"
				/>
			</svg>
		</div>
		<span class="collapsed-label">Context</span>
		<div class="collapsed-badge">{conversations.length}</div>
	</button>
{:else}
	<!-- Expanded state: full panel -->
	<aside class="context-panel" transition:fly={{ x: -280, duration: 200 }}>
		<!-- Header with collapse button -->
		<header class="panel-header">
			<h3 class="panel-title">{isWorkUnit ? 'Task Context' : 'Subtask Context'}</h3>
			<button
				type="button"
				class="collapse-btn"
				onclick={onToggleCollapse}
				title="Collapse panel"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</button>
		</header>

		<!-- Scrollable content -->
		<div class="panel-content">
			<!-- Work Unit Mode: Task Details -->
			{#if isWorkUnit && task}
				<section class="details-section">
					<h4 class="section-label">Details</h4>
					<div class="details-grid">
						{#if task.dueDate}
							<div class="detail-item">
								<span class="detail-label">Due</span>
								<span class="detail-value" class:overdue={task.dueDate < new Date()}>
									{formatDueDate(task.dueDate)}
									{#if task.dueDateType === 'hard'}
										<span class="hard-badge">Hard</span>
									{/if}
								</span>
							</div>
						{/if}
						{#if task.priority === 'high'}
							<div class="detail-item">
								<span class="detail-label">Priority</span>
								<span class="detail-value high-priority">High</span>
							</div>
						{/if}
						{#if task.estimatedEffort}
							<div class="detail-item">
								<span class="detail-label">Effort</span>
								<span class="detail-value">{formatEffort(task.estimatedEffort)}</span>
							</div>
						{/if}
					</div>
				</section>

				{#if task.description}
					<section class="description-section">
						<h4 class="section-label">Description</h4>
						<p class="description-text">{task.description}</p>
					</section>
				{/if}

				<!-- Planning Mode Actions -->
				{#if isPlanningMode}
					<section class="action-section">
						<button type="button" class="cancel-plan-btn" onclick={onCancelPlanMode}>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
							Cancel Planning
						</button>
					</section>
				{:else if !isCompleted && onStartPlanMode}
					<section class="action-section">
						<button type="button" class="plan-btn" onclick={onStartPlanMode}>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
							</svg>
							Help me plan this
						</button>
					</section>
				{/if}

				<div class="divider"></div>
			<!-- Subtask Mode: Rich Context Section - Expandable card -->
			{:else if hasRichContext && richContext}
				<section class="context-card" class:expanded={contextExpanded}>
					<!-- Clickable header to toggle expand -->
					<button
						type="button"
						class="context-header"
						onclick={() => contextExpanded = !contextExpanded}
					>
						<span class="context-header-label">Context</span>
						<svg
							class="expand-icon"
							class:rotated={contextExpanded}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if contextExpanded}
						<!-- Expanded: Full content -->
						<div class="context-expanded" transition:slide={{ duration: 200 }}>
							<div class="context-block">
								<span class="block-label">Why this matters</span>
								<p class="block-text">{richContext.whyImportant}</p>
							</div>

							<div class="context-block">
								<span class="block-label">Done when</span>
								<p class="block-text">{richContext.definitionOfDone}</p>
							</div>

							{#if richContext.hints && richContext.hints.length > 0}
								<div class="context-block">
									<span class="block-label">Tips</span>
									<ul class="tips-list">
										{#each richContext.hints as hint}
											<li>{hint}</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					{:else}
						<!-- Collapsed: Compact preview -->
						<div class="context-preview">
							<div class="preview-row">
								<span class="preview-label">Why</span>
								<span class="preview-text">{richContext.whyImportant}</span>
							</div>
							<div class="preview-row">
								<span class="preview-label">Done</span>
								<span class="preview-text">{richContext.definitionOfDone}</span>
							</div>
							{#if richContext.hints && richContext.hints.length > 0}
								<div class="preview-row">
									<span class="preview-label">Tips</span>
									<span class="preview-text">{richContext.hints.length} tip{richContext.hints.length !== 1 ? 's' : ''}</span>
								</div>
							{/if}
						</div>
					{/if}
				</section>
			{:else if parentTask}
				<!-- Minimal context when no rich context (subtask mode only) -->
				<section class="context-card minimal">
					<div class="context-preview">
						<div class="preview-row">
							<span class="preview-label">Task</span>
							<span class="preview-text">{parentTask.title}</span>
						</div>
					</div>
				</section>
			{/if}

			<!-- Conversations Section -->
			<section class="conversations-section">
				<div class="section-header">
					<h4 class="section-title">Conversations</h4>
					<span class="section-count">{conversations.length}</span>
					{#if isCompleted}
						<span class="read-only-badge">Read-only</span>
					{/if}
				</div>

				<!-- New Chat Button (hidden when completed) -->
				{#if !isCompleted}
					<button type="button" class="new-chat-btn" onclick={onNewChat}>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						New conversation
					</button>
				{/if}

				<!-- Conversation List -->
				{#if conversations.length > 0}
					<ul class="conversation-list">
						{#each conversations as conv (conv.id)}
							<li class="conversation-item">
								{#if renamingConversationId === conv.id}
									<!-- Rename mode -->
									<div class="rename-container">
										<input
											bind:this={renameInputRef}
											type="text"
											bind:value={renameValue}
											onkeydown={handleRenameKeydown}
											onblur={submitRename}
											class="rename-input"
											placeholder="Conversation title..."
										/>
									</div>
								{:else}
									<!-- Normal card with optional menu -->
									<button
										type="button"
										class="conversation-card"
										class:active={conv.id === activeConversationId}
										onclick={() => onSelectConversation(conv.id)}
									>
										<div class="card-icon">
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
												/>
											</svg>
										</div>
										<div class="card-content">
											<span class="card-title">{getConversationPreview(conv)}</span>
											<span class="card-time">{formatRelativeTime(conv.updatedAt)}</span>
										</div>
										{#if isPinned(conv)}
											<div class="pin-badge" title="Pinned">
												<Star size={10} fill="currentColor" />
											</div>
										{/if}
										{#if conv.id === activeConversationId}
											<div class="active-indicator"></div>
										{/if}
									</button>

									<!-- Menu trigger (only if actions available) -->
									{#if hasConversationActions}
										<button
											type="button"
											class="menu-trigger"
											class:menu-open={openMenuId === conv.id}
											onclick={(e) => toggleMenu(e, conv.id)}
											aria-label="More options"
										>
											<MoreVertical size={14} />
										</button>
									{/if}
								{/if}
							</li>
						{/each}
					</ul>

					<!-- Dropdown menu (rendered once, positioned via state) -->
					{#if openMenuId}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div
							class="menu-backdrop"
							onclick={closeMenu}
						></div>
						<div
							class="dropdown-menu"
							style="top: {menuPosition.top}px; left: {menuPosition.left}px;"
							transition:fade={{ duration: 100 }}
						>
							{#if onRenameConversation}
								{@const conv = conversations.find(c => c.id === openMenuId)}
								{#if conv}
									<button type="button" class="dropdown-item" onclick={() => startRename(conv)}>
										<Edit3 size={14} />
										Rename
									</button>
								{/if}
							{/if}
							{#if onPinConversation}
								{@const conv = conversations.find(c => c.id === openMenuId)}
								{#if conv}
									<button type="button" class="dropdown-item" onclick={() => handleMenuAction(() => onPinConversation!(openMenuId!))}>
										<Star size={14} fill={isPinned(conv) ? 'currentColor' : 'none'} />
										{isPinned(conv) ? 'Unpin' : 'Pin'}
									</button>
								{/if}
							{/if}
							{#if openMenuId}
								<button type="button" class="dropdown-item export-trigger" onclick={() => showExportOptions = !showExportOptions}>
									<Download size={14} />
									Export
									<ChevronDown size={12} class="expand-chevron {showExportOptions ? 'expanded' : ''}" />
								</button>
								{#if showExportOptions}
									<div class="export-submenu">
										<button type="button" class="dropdown-item export-option" onclick={() => exportAs('markdown', openMenuId!)}>
											<FileText size={12} />
											Markdown
										</button>
										<button type="button" class="dropdown-item export-option" onclick={() => exportAs('json', openMenuId!)}>
											<FileCode size={12} />
											JSON
										</button>
										<button type="button" class="dropdown-item export-option" onclick={() => exportAs('plaintext', openMenuId!)}>
											<FileDown size={12} />
											Plain Text
										</button>
									</div>
								{/if}
							{/if}
							{#if onDeleteConversation}
								<div class="dropdown-divider"></div>
								<button type="button" class="dropdown-item dropdown-item-danger" onclick={() => handleMenuAction(() => onDeleteConversation!(openMenuId!))}>
									<Trash2 size={14} />
									Delete
								</button>
							{/if}
						</div>
					{/if}
				{:else}
					<p class="empty-state">No conversations yet</p>
				{/if}
			</section>

			<!-- Divider -->
			<div class="divider"></div>

			<!-- Quick Start Section -->
			<section class="quick-start-section">
				<span class="quick-label">Quick start:</span>
				<div class="action-chips">
					{#each quickStarts as qs}
						<button type="button" class="action-chip" onclick={() => handleQuickStart(qs.prompt, qs.label)}>
							<svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d={ICON_PATHS[qs.icon]} />
							</svg>
							{qs.label}
						</button>
					{/each}
				</div>
			</section>
		</div>
	</aside>
{/if}

<style>
	/* Collapsed State */
	.collapsed-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 0.5rem;
		width: 3rem;
		height: 100%;
		background: rgba(255, 255, 255, 0.02);
		border-right: 1px solid rgba(255, 255, 255, 0.08);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.collapsed-panel:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.collapsed-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.375rem;
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.5);
	}

	.collapsed-label {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
	}

	.collapsed-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(59, 130, 246, 0.2);
		border-radius: 0.375rem;
	}

	/* Expanded State */
	.context-panel {
		display: flex;
		flex-direction: column;
		width: 280px;
		min-width: 280px;
		height: 100%;
		background: rgba(255, 255, 255, 0.02);
		border-right: 1px solid rgba(255, 255, 255, 0.08);
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.panel-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.8);
		margin: 0;
	}

	.collapse-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.375rem;
		color: rgba(255, 255, 255, 0.4);
		transition: all 0.15s ease;
	}

	.collapse-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* Context Card - Expandable design */
	.context-card {
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 0.5rem;
		border-left: 2px solid var(--task-color, var(--space-accent, #3b82f6));
		overflow: hidden;
	}

	.context-card.minimal {
		background: transparent;
		border-left: none;
	}

	.context-card.expanded {
		background: rgba(255, 255, 255, 0.03);
	}

	/* Context header - clickable toggle */
	.context-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.625rem;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.context-header:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.context-header-label {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.5);
	}

	.expand-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: rgba(255, 255, 255, 0.35);
		transition: transform 0.2s ease;
	}

	.expand-icon.rotated {
		transform: rotate(180deg);
	}

	/* Collapsed: Compact preview */
	.context-preview {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0 0.625rem 0.5rem;
	}

	.preview-row {
		display: flex;
		gap: 0.375rem;
		align-items: baseline;
	}

	.preview-label {
		flex-shrink: 0;
		font-size: 0.5625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--task-color, var(--space-accent, #3b82f6));
	}

	.preview-text {
		flex: 1;
		min-width: 0;
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.55);
		line-height: 1.4;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Expanded: Full content */
	.context-expanded {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding: 0.25rem 0.625rem 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}

	.context-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.block-label {
		font-size: 0.5625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--task-color, var(--space-accent, #3b82f6));
	}

	.block-text {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.5;
		margin: 0;
	}

	.tips-list {
		margin: 0;
		padding-left: 1rem;
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.6;
	}

	.tips-list li {
		margin-bottom: 0.125rem;
	}

	.tips-list li:last-child {
		margin-bottom: 0;
	}

	/* Conversations Section */
	.conversations-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.section-title {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	.section-count {
		font-size: 0.625rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		padding: 0.125rem 0.375rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.25rem;
	}

	.read-only-badge {
		margin-left: auto;
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(34, 197, 94, 0.8);
		padding: 0.125rem 0.375rem;
		background: rgba(34, 197, 94, 0.1);
		border-radius: 0.25rem;
	}

	.new-chat-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--task-color, var(--space-accent, #3b82f6));
		background: color-mix(in srgb, var(--task-color, var(--space-accent, #3b82f6)) 10%, transparent);
		border: 1px dashed color-mix(in srgb, var(--task-color, var(--space-accent, #3b82f6)) 30%, transparent);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.new-chat-btn:hover {
		background: color-mix(in srgb, var(--task-color, var(--space-accent, #3b82f6)) 15%, transparent);
		border-style: solid;
	}

	.conversation-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.conversation-card {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.5rem 0.625rem;
		background: transparent;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
		position: relative;
	}

	.conversation-card:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.conversation-card.active {
		background: rgba(59, 130, 246, 0.1);
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.375rem;
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
		flex-shrink: 0;
	}

	.card-icon svg {
		width: 1rem;
		height: 1rem;
	}

	.card-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.card-title {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.85);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-time {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.active-indicator {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 3px;
		height: 60%;
		background: var(--task-color, var(--space-accent, #3b82f6));
		border-radius: 0 2px 2px 0;
	}

	.empty-state {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		text-align: center;
		padding: 0.75rem;
		margin: 0;
	}

	/* Quick Start Section */
	.quick-start-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.quick-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
	}

	.action-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.action-chip {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.625rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-icon {
		width: 0.75rem;
		height: 0.75rem;
		flex-shrink: 0;
	}

	.action-chip:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	/* Work Unit Mode Styles */
	.details-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section-label {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.details-grid {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.375rem 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 0.375rem;
	}

	.detail-label {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.detail-value {
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.detail-value.overdue {
		color: #ef4444;
	}

	.detail-value.high-priority {
		color: #f59e0b;
	}

	.hard-badge {
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		padding: 0.125rem 0.25rem;
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
		border-radius: 0.25rem;
	}

	.description-section {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.description-text {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.5;
		margin: 0;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 0.375rem;
		border-left: 2px solid var(--task-color, #3b82f6);
	}

	.action-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.plan-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #4ade80;
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.plan-btn:hover {
		background: rgba(34, 197, 94, 0.15);
		border-color: rgba(34, 197, 94, 0.5);
	}

	.plan-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.cancel-plan-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #f87171;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.cancel-plan-btn:hover {
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.5);
	}

	.cancel-plan-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.06);
		margin: 0.25rem 0;
	}

	/* Conversation item with menu */
	.conversation-item {
		position: relative;
	}

	.conversation-item:hover .menu-trigger {
		opacity: 1;
	}

	.menu-trigger {
		position: absolute;
		right: 0.25rem;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 0.25rem;
		color: rgba(255, 255, 255, 0.4);
		background: transparent;
		border: none;
		cursor: pointer;
		opacity: 0;
		transition: all 0.15s ease;
		z-index: 2;
	}

	.menu-trigger:hover,
	.menu-trigger.menu-open {
		opacity: 1;
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.1);
	}

	.menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
	}

	.dropdown-menu {
		position: fixed;
		width: 140px;
		padding: 0.25rem 0;
		background: #18181b;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
		z-index: 51;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.8);
		background: none;
		border: none;
		cursor: pointer;
		transition: background-color 0.1s ease;
		text-align: left;
	}

	.dropdown-item:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.dropdown-item-danger {
		color: #f87171;
	}

	.dropdown-item-danger:hover {
		background: rgba(248, 113, 113, 0.1);
	}

	.export-trigger {
		justify-content: flex-start;
	}

	.export-trigger :global(.expand-chevron) {
		margin-left: auto;
		opacity: 0.5;
		transition: transform 0.15s ease;
	}

	.export-trigger :global(.expand-chevron.expanded) {
		transform: rotate(180deg);
	}

	.export-submenu {
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding: 0.125rem 0;
		background: rgba(255, 255, 255, 0.02);
	}

	.export-option {
		padding-left: 1.75rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		gap: 0.375rem;
	}

	.export-option:hover {
		color: rgba(255, 255, 255, 0.9);
	}

	.dropdown-divider {
		height: 1px;
		margin: 0.25rem 0;
		background: rgba(255, 255, 255, 0.1);
	}

	/* Pin badge */
	.pin-badge {
		position: absolute;
		right: 1.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: #fbbf24;
		z-index: 1;
	}

	.conversation-item:hover .pin-badge {
		opacity: 0;
	}

	/* Rename input */
	.rename-container {
		padding: 0.375rem;
	}

	.rename-input {
		width: 100%;
		padding: 0.5rem 0.625rem;
		font-size: 0.8125rem;
		font-weight: 500;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(59, 130, 246, 0.5);
		border-radius: 0.375rem;
		color: rgba(255, 255, 255, 0.9);
		outline: none;
	}

	.rename-input:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}

	.rename-input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}
</style>
