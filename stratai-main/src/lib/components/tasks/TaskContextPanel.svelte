<script lang="ts">
	/**
	 * TaskContextPanel - Collapsible side panel for subtask context and conversations
	 *
	 * Shows when user returns to a subtask (has existing conversations):
	 * - Rich context (Why This Matters, Done When, Tips)
	 * - Conversation list with cards
	 * - New Chat button
	 * - Quick Start actions
	 *
	 * Collapsible to slim sidebar when user is focused on chat.
	 */
	import { slide, fly } from 'svelte/transition';
	import type { Task, SubtaskContext } from '$lib/types/tasks';
	import type { Conversation } from '$lib/types/chat';
	import { getQuickActions } from '$lib/utils/subtask-welcome';

	interface Props {
		subtask: Task;
		parentTask: Task;
		conversations: Conversation[];
		activeConversationId: string | null;
		collapsed: boolean;
		isCompleted?: boolean;
		onSelectConversation: (id: string) => void;
		onNewChat: () => void;
		onToggleCollapse: () => void;
		onQuickAction: (action: string) => void;
	}

	let {
		subtask,
		parentTask,
		conversations,
		activeConversationId,
		collapsed,
		isCompleted = false,
		onSelectConversation,
		onNewChat,
		onToggleCollapse,
		onQuickAction
	}: Props = $props();

	// Parse rich context from subtask.contextSummary
	let richContext = $derived.by((): SubtaskContext | null => {
		if (!subtask.contextSummary) return null;
		try {
			return JSON.parse(subtask.contextSummary) as SubtaskContext;
		} catch {
			return null;
		}
	});

	let hasRichContext = $derived(richContext !== null);
	let quickActions = $derived(getQuickActions(subtask));

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

	// Handle quick action click
	function handleQuickAction(action: string) {
		const event = new CustomEvent('prepopulate-input', {
			detail: { text: action },
			bubbles: true
		});
		document.dispatchEvent(event);
		onQuickAction(action);
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
			<h3 class="panel-title">Subtask Context</h3>
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
			<!-- Rich Context Section - Expandable card -->
			{#if hasRichContext && richContext}
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
			{:else}
				<!-- Minimal context when no rich context -->
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
							<li>
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
									{#if conv.id === activeConversationId}
										<div class="active-indicator"></div>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
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
					{#each quickActions as action}
						<button type="button" class="action-chip" onclick={() => handleQuickAction(action)}>
							{action}
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

	.action-chip:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}
</style>
