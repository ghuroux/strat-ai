<script lang="ts">
	/**
	 * PageAuditLog.svelte - Activity log panel for pages
	 *
	 * Features:
	 * - Timeline view of audit events
	 * - Event filtering (All, Views, Edits, Sharing)
	 * - Time grouping (Today, Yesterday, This Week, Earlier)
	 * - Pagination with "Load More"
	 * - Admin-only access (enforced by API)
	 *
	 * Phase 3: Page Sharing - Audit UI
	 */

	import { onMount } from 'svelte';
	import {
		X, Eye, Edit, Share2, Shield, Clock, Users, Lock,
		FilePlus, Unlock, RotateCcw, BookOpen, BookX, Download, Trash2
	} from 'lucide-svelte';
	import type { AuditEventWithUser, AuditEventType } from '$lib/types/audit';
	import { AUDIT_FILTER_GROUPS } from '$lib/types/audit';

	// Props
	interface Props {
		pageId: string;
		onClose: () => void;
	}

	let { pageId, onClose }: Props = $props();

	// State
	let events = $state<AuditEventWithUser[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let filter = $state<'all' | 'views' | 'edits' | 'lifecycle' | 'sharing'>('all');
	let offset = $state(0);
	let hasMore = $state(true);
	const LIMIT = 50;

	// Reload when filter changes
	$effect(() => {
		// Trigger reload when filter changes
		const currentFilter = filter;
		offset = 0;
		hasMore = true;
		events = [];
		loadEvents(false);
	});

	// Load events on mount
	onMount(() => {
		loadEvents(false);
	});

	// Load events from API
	async function loadEvents(append = false) {
		try {
			isLoading = true;
			error = null;

			// Map filter to event types using filter groups
			let eventTypes: AuditEventType[] | undefined;
			switch (filter) {
				case 'views':
					eventTypes = AUDIT_FILTER_GROUPS.views;
					break;
				case 'edits':
					eventTypes = AUDIT_FILTER_GROUPS.edits;
					break;
				case 'lifecycle':
					eventTypes = AUDIT_FILTER_GROUPS.lifecycle;
					break;
				case 'sharing':
					eventTypes = AUDIT_FILTER_GROUPS.sharing;
					break;
				default:
					eventTypes = undefined;
			}

			const params = new URLSearchParams({
				limit: String(LIMIT),
				offset: String(append ? offset : 0)
			});
			if (eventTypes) {
				params.set('eventTypes', eventTypes.join(','));
			}

			const response = await fetch(`/api/pages/${pageId}/audit?${params}`);

			if (!response.ok) {
				if (response.status === 403) {
					error = 'Access denied. Only the page owner or admins can view the activity log.';
				} else {
					error = 'Failed to load activity';
				}
				return;
			}

			const data = await response.json();

			if (append) {
				events = [...events, ...data.events];
			} else {
				events = data.events;
			}

			hasMore = data.events.length === LIMIT;
			offset = append ? offset + LIMIT : LIMIT;
		} catch (e) {
			console.error('Failed to load audit events:', e);
			error = 'Failed to load activity';
		} finally {
			isLoading = false;
		}
	}

	// Time grouping helpers
	function isSameDay(d1: Date, d2: Date): boolean {
		return (
			d1.getFullYear() === d2.getFullYear() &&
			d1.getMonth() === d2.getMonth() &&
			d1.getDate() === d2.getDate()
		);
	}

	function groupEventsByTime(eventsList: AuditEventWithUser[]) {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const weekAgo = new Date(today);
		weekAgo.setDate(weekAgo.getDate() - 7);

		const groups = {
			today: [] as AuditEventWithUser[],
			yesterday: [] as AuditEventWithUser[],
			thisWeek: [] as AuditEventWithUser[],
			earlier: [] as AuditEventWithUser[]
		};

		for (const event of eventsList) {
			const eventDate = new Date(event.createdAt);
			if (isSameDay(eventDate, today)) {
				groups.today.push(event);
			} else if (isSameDay(eventDate, yesterday)) {
				groups.yesterday.push(event);
			} else if (eventDate > weekAgo) {
				groups.thisWeek.push(event);
			} else {
				groups.earlier.push(event);
			}
		}

		return groups;
	}

	// Derived grouped events
	let groupedEvents = $derived(groupEventsByTime(events));

	// Group label helper
	function groupLabel(group: string): string {
		switch (group) {
			case 'today':
				return 'Today';
			case 'yesterday':
				return 'Yesterday';
			case 'thisWeek':
				return 'This Week';
			case 'earlier':
				return 'Earlier';
			default:
				return group;
		}
	}

	// Event formatting
	function formatEvent(event: AuditEventWithUser): string {
		const metadata = event.metadata as Record<string, unknown>;

		switch (event.eventType) {
			case 'page_viewed':
				return 'viewed this page';
			case 'page_edited':
				return 'edited this page';
			case 'page_created':
				return 'created this page';
			case 'page_deleted':
				return 'deleted this page';
			case 'page_finalized':
				return `finalized as v${metadata.version_number ?? '?'}`;
			case 'page_unlocked': {
				const keptCtx = metadata.kept_in_context ? ' (kept in context)' : '';
				return `unlocked v${metadata.from_version ?? '?'} for editing${keptCtx}`;
			}
			case 'page_version_restored':
				return `restored to v${metadata.restored_version ?? '?'}`;
			case 'page_context_added':
				return `added v${metadata.version_number ?? '?'} to AI context`;
			case 'page_context_removed':
				return 'removed from AI context';
			case 'page_exported':
				return `exported as ${metadata.format ?? 'file'}`;
			case 'page_shared_user':
				return `shared with ${metadata.target_user_name || 'a user'} as ${metadata.permission}`;
			case 'page_shared_group':
				return `shared with ${metadata.target_group_name || 'a group'} as ${metadata.permission}`;
			case 'page_unshared_user':
				return `removed ${metadata.target_user_name || 'a user'}`;
			case 'page_unshared_group':
				return `removed ${metadata.target_group_name || 'a group'}`;
			case 'page_permission_changed':
				return `changed ${metadata.target_name || 'permission'} from ${metadata.old_permission} to ${metadata.new_permission}`;
			case 'page_visibility_changed': {
				const sharesRemoved = metadata.specific_shares_removed as number | undefined;
				let msg = `changed visibility from ${metadata.old_visibility} to ${metadata.new_visibility}`;
				if (sharesRemoved && sharesRemoved > 0) {
					msg += ` (${sharesRemoved} shares removed)`;
				}
				return msg;
			}
			default:
				return event.action;
		}
	}

	// Get icon for event type
	function getEventIcon(eventType: AuditEventType) {
		switch (eventType) {
			case 'page_viewed':
				return Eye;
			case 'page_edited':
				return Edit;
			case 'page_created':
				return FilePlus;
			case 'page_finalized':
				return Lock;
			case 'page_unlocked':
				return Unlock;
			case 'page_version_restored':
				return RotateCcw;
			case 'page_context_added':
				return BookOpen;
			case 'page_context_removed':
				return BookX;
			case 'page_exported':
				return Download;
			case 'page_deleted':
				return Trash2;
			case 'page_shared_user':
			case 'page_shared_group':
			case 'page_unshared_user':
			case 'page_unshared_group':
				return Share2;
			case 'page_permission_changed':
				return Shield;
			case 'page_visibility_changed':
				return Users;
			default:
				return Clock;
		}
	}

	// Get detail line for events with rich metadata (returns null if no details worth showing)
	function getEventDetails(event: AuditEventWithUser): string | null {
		const m = event.metadata as Record<string, unknown>;

		switch (event.eventType) {
			case 'page_created': {
				const parts: string[] = [];
				if (m.page_type && m.page_type !== 'general') parts.push(String(m.page_type));
				if (m.visibility) parts.push(String(m.visibility));
				if (m.source_conversation_id) parts.push('from chat');
				return parts.length > 0 ? parts.join(' · ') : null;
			}
			case 'page_edited': {
				const parts: string[] = [];
				const before = m.word_count_before as number | undefined;
				const after = m.word_count_after as number | undefined;
				if (before != null && after != null) {
					const diff = after - before;
					if (diff > 0) parts.push(`+${diff} words (${after.toLocaleString()} total)`);
					else if (diff < 0) parts.push(`${diff} words (${after.toLocaleString()} total)`);
					else parts.push(`${after.toLocaleString()} words`);
				}
				if (m.title_changed) parts.push('title changed');
				return parts.length > 0 ? parts.join(' · ') : null;
			}
			case 'page_finalized': {
				const parts: string[] = [];
				const wc = m.word_count as number | undefined;
				if (wc) parts.push(`${wc.toLocaleString()} words`);
				if (m.added_to_context) parts.push('added to AI context');
				if (m.change_summary) parts.push(`"${m.change_summary}"`);
				return parts.length > 0 ? parts.join(' · ') : null;
			}
			case 'page_unlocked': {
				if (m.kept_in_context && m.context_version_number) {
					return `context pinned at v${m.context_version_number}`;
				}
				return null;
			}
			case 'page_version_restored': {
				if (m.current_version_before) {
					return `was at v${m.current_version_before}`;
				}
				return null;
			}
			case 'page_deleted': {
				const parts: string[] = [];
				if (m.was_finalized) parts.push('was finalized');
				if (m.was_in_context) parts.push('was in context');
				const vc = m.version_count as number | undefined;
				if (vc && vc > 0) parts.push(`${vc} version${vc > 1 ? 's' : ''}`);
				return parts.length > 0 ? parts.join(' · ') : null;
			}
			default:
				return null;
		}
	}

	// Get initials from name
	function getInitials(name: string | null): string {
		if (!name) return '?';
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// Format relative time
	function formatRelativeTime(date: Date | string | null | undefined): string {
		if (!date) return 'Unknown';
		const now = new Date();
		const eventDate = typeof date === 'string' ? new Date(date) : date;
		if (isNaN(eventDate.getTime())) return 'Unknown';
		const diff = Math.floor((now.getTime() - eventDate.getTime()) / 1000);

		if (diff < 60) return 'Just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

		return eventDate.toLocaleDateString();
	}

	// Handle keyboard
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="audit-panel">
	<!-- Header -->
	<header class="audit-header">
		<h3>Activity</h3>
		<button type="button" class="close-btn" onclick={onClose} aria-label="Close activity panel">
			<X size={18} />
		</button>
	</header>

	<!-- Filter tabs -->
	<div class="filter-tabs">
		<button
			type="button"
			class="filter-tab"
			class:active={filter === 'all'}
			onclick={() => (filter = 'all')}
			aria-pressed={filter === 'all'}
		>
			All
		</button>
		<button
			type="button"
			class="filter-tab"
			class:active={filter === 'views'}
			onclick={() => (filter = 'views')}
			aria-pressed={filter === 'views'}
		>
			Views
		</button>
		<button
			type="button"
			class="filter-tab"
			class:active={filter === 'edits'}
			onclick={() => (filter = 'edits')}
			aria-pressed={filter === 'edits'}
		>
			Edits
		</button>
		<button
			type="button"
			class="filter-tab"
			class:active={filter === 'lifecycle'}
			onclick={() => (filter = 'lifecycle')}
			aria-pressed={filter === 'lifecycle'}
		>
			Lifecycle
		</button>
		<button
			type="button"
			class="filter-tab"
			class:active={filter === 'sharing'}
			onclick={() => (filter = 'sharing')}
			aria-pressed={filter === 'sharing'}
		>
			Sharing
		</button>
	</div>

	<!-- Event timeline -->
	<div class="event-timeline">
		{#if isLoading && events.length === 0}
			<div class="loading-state">
				<div class="spinner"></div>
				<span>Loading activity...</span>
			</div>
		{:else if error}
			<div class="error-state">
				<span>{error}</span>
				<button type="button" class="retry-btn" onclick={() => loadEvents(false)}>Retry</button>
			</div>
		{:else if events.length === 0}
			<div class="empty-state">
				<Clock size={32} strokeWidth={1.5} />
				<span>No activity yet</span>
			</div>
		{:else}
			{#each Object.entries(groupedEvents) as [group, groupEvents]}
				{#if groupEvents.length > 0}
					<div class="time-group">
						<h4 class="group-header">{groupLabel(group)}</h4>
						{#each groupEvents as event}
							<div class="event-item">
								<div class="event-avatar">{getInitials(event.userName)}</div>
								<div class="event-content">
									<div class="event-main">
										<span class="event-user">{event.userName || 'Unknown'}</span>
										<span class="event-action">{formatEvent(event)}</span>
									</div>
									{#if getEventDetails(event)}
										<div class="event-details">
											└─ {getEventDetails(event)}
										</div>
									{/if}
									<div class="event-meta">
										<svelte:component this={getEventIcon(event.eventType)} size={12} />
										<span class="event-time">{formatRelativeTime(event.createdAt)}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/each}

			{#if hasMore}
				<button
					type="button"
					class="load-more-btn"
					onclick={() => loadEvents(true)}
					disabled={isLoading}
				>
					{#if isLoading}
						<div class="spinner small"></div>
						Loading...
					{:else}
						Load More
					{/if}
				</button>
			{/if}
		{/if}
	</div>
</div>

<style>
	.audit-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--editor-bg);
	}

	/* Header */
	.audit-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--editor-border);
	}

	.audit-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--editor-text);
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--editor-text-secondary);
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
	}

	.close-btn:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	/* Filter tabs */
	.filter-tabs {
		display: flex;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--editor-border);
		background: var(--editor-bg-secondary);
	}

	.filter-tab {
		padding: 0.375rem 0.75rem;
		border: none;
		background: transparent;
		color: var(--editor-text-secondary);
		font-size: 0.8125rem;
		font-weight: 500;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
	}

	.filter-tab:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.filter-tab.active {
		background: var(--toolbar-button-active);
		color: var(--editor-text);
	}

	/* Event timeline */
	.event-timeline {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	/* Loading state */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		color: var(--editor-text-secondary);
		font-size: 0.875rem;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--editor-border);
		border-top-color: var(--editor-border-focus);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.spinner.small {
		width: 14px;
		height: 14px;
		border-width: 2px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Error state */
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		color: var(--editor-text-secondary);
		font-size: 0.875rem;
		text-align: center;
	}

	.retry-btn {
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--editor-border);
		background: transparent;
		color: var(--editor-text);
		font-size: 0.8125rem;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 100ms ease;
	}

	.retry-btn:hover {
		background: var(--toolbar-button-hover);
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		color: var(--editor-text-secondary);
		font-size: 0.875rem;
	}

	/* Time groups */
	.time-group {
		margin-bottom: 1.5rem;
	}

	.time-group:last-child {
		margin-bottom: 0;
	}

	.group-header {
		margin: 0 0 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--editor-border);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--editor-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Event items */
	.event-item {
		display: flex;
		gap: 0.75rem;
		padding: 0.625rem 0;
		border-radius: 6px;
		transition: background-color 100ms ease;
	}

	.event-item:hover {
		background: var(--toolbar-button-hover);
		margin: 0 -0.5rem;
		padding-left: 0.5rem;
		padding-right: 0.5rem;
	}

	.event-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--editor-border-focus);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		flex-shrink: 0;
	}

	.event-content {
		flex: 1;
		min-width: 0;
	}

	.event-main {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-bottom: 0.25rem;
	}

	.event-user {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--editor-text);
	}

	.event-action {
		font-size: 0.875rem;
		color: var(--editor-text-secondary);
	}

	.event-details {
		font-size: 0.75rem;
		color: var(--editor-text-muted);
		margin-bottom: 0.125rem;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
		letter-spacing: -0.01em;
	}

	.event-meta {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: var(--editor-text-muted);
	}

	.event-time {
		opacity: 0.8;
	}

	/* Load more button */
	.load-more-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem;
		margin-top: 1rem;
		border: 1px solid var(--editor-border);
		background: transparent;
		color: var(--editor-text);
		font-size: 0.875rem;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 100ms ease;
	}

	.load-more-btn:hover:not(:disabled) {
		background: var(--toolbar-button-hover);
	}

	.load-more-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
