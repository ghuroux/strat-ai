<!--
	TaskContextSection.svelte

	Displays linked context (documents + related tasks) for a task with add/remove functionality.
	Used in FocusedTaskWelcome, TaskPanel, and PlanModePanel.
-->
<script lang="ts">
	import type { TaskDocumentLink } from '$lib/stores/documents.svelte';
	import type { RelatedTaskInfo } from '$lib/types/tasks';
	import { estimateTokens } from '$lib/utils/context-builder';

	interface Props {
		taskId: string;
		documents: TaskDocumentLink[];
		relatedTasks: RelatedTaskInfo[];
		onAddContext?: () => void;
		onRemoveDocument?: (id: string) => void;
		onRemoveRelatedTask?: (id: string) => void;
		readonly?: boolean;
		collapsed?: boolean;
	}

	let {
		taskId,
		documents = [],
		relatedTasks = [],
		onAddContext,
		onRemoveDocument,
		onRemoveRelatedTask,
		readonly = false,
		collapsed = false
	}: Props = $props();

	// Calculate token estimate from all context
	let totalChars = $derived(() => {
		let chars = 0;
		for (const doc of documents) {
			chars += doc.charCount;
		}
		for (const rt of relatedTasks) {
			chars += rt.task.title.length + (rt.task.contextSummary?.length ?? 0) + 100;
		}
		return chars;
	});

	let tokenEstimate = $derived(estimateTokens(totalChars()));

	let hasContext = $derived(documents.length > 0 || relatedTasks.length > 0);

	// Local expand state for readonly mode
	let isExpanded = $state(!collapsed);

	function toggleExpanded() {
		if (readonly) {
			isExpanded = !isExpanded;
		}
	}

	/**
	 * Get file icon based on mime type
	 */
	function getFileIcon(mimeType: string): string {
		if (mimeType.includes('pdf')) return '📄';
		if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
		if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
		if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
		if (mimeType.includes('text') || mimeType.includes('markdown')) return '📃';
		if (mimeType.includes('json') || mimeType.includes('csv')) return '📋';
		return '📄';
	}

	/**
	 * Format file size for display
	 */
	function formatCharCount(charCount: number): string {
		if (charCount >= 1000000) {
			return `${(charCount / 1000000).toFixed(1)}M chars`;
		}
		if (charCount >= 1000) {
			return `${(charCount / 1000).toFixed(1)}k chars`;
		}
		return `${charCount} chars`;
	}

	/**
	 * Get relationship icon
	 */
	function getRelationshipIcon(type: string): string {
		switch (type) {
			case 'blocks':
				return '⛔';
			case 'depends_on':
				return '⏳';
			case 'informs':
				return '💡';
			default:
				return '🔗';
		}
	}

	/**
	 * Get status badge
	 */
	function getStatusBadge(status: string): string {
		switch (status) {
			case 'completed':
				return '✓';
			case 'deferred':
				return '⏸';
			default:
				return '';
		}
	}
</script>

<div class="context-section" class:readonly class:collapsed={!isExpanded && readonly}>
	<!-- Header -->
	<div class="context-header">
		<button
			type="button"
			class="header-label"
			onclick={toggleExpanded}
			disabled={!readonly}
		>
			<span class="icon">📎</span>
			<span class="label">Context</span>
			{#if hasContext}
				<span class="count">({documents.length + relatedTasks.length})</span>
			{/if}
			{#if readonly && hasContext}
				<span class="expand-icon" class:expanded={isExpanded}>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
						<path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</span>
			{/if}
		</button>

		{#if !readonly && onAddContext}
			<button type="button" class="add-button" onclick={onAddContext}>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
					<path d="M7 2.5V11.5M2.5 7H11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
				<span>Add</span>
			</button>
		{/if}
	</div>

	<!-- Content -->
	{#if isExpanded || !readonly}
		<div class="context-content">
			{#if !hasContext}
				<p class="empty-state">
					Add documents or link tasks for context
				</p>
			{:else}
				<!-- Document chips -->
				{#each documents as doc (doc.documentId)}
					<div class="context-chip document-chip">
						<span class="chip-icon">{getFileIcon(doc.mimeType)}</span>
						<span class="chip-label" title={doc.filename}>
							{doc.title || doc.filename}
						</span>
						<span class="chip-meta">{formatCharCount(doc.charCount)}</span>
						{#if !readonly && onRemoveDocument}
							<button
								type="button"
								class="chip-remove"
								onclick={() => onRemoveDocument?.(doc.documentId)}
								title="Remove document"
							>
								<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
									<path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
								</svg>
							</button>
						{/if}
					</div>
				{/each}

				<!-- Related task chips -->
				{#each relatedTasks as rt (rt.task.id)}
					<div class="context-chip task-chip">
						<span class="chip-icon">{getRelationshipIcon(rt.relationshipType)}</span>
						<span class="chip-label" title={rt.task.title}>
							{rt.task.title}
						</span>
						{#if rt.task.status !== 'active'}
							<span class="chip-status">{getStatusBadge(rt.task.status)}</span>
						{/if}
						{#if !readonly && onRemoveRelatedTask}
							<button
								type="button"
								class="chip-remove"
								onclick={() => onRemoveRelatedTask?.(rt.task.id)}
								title="Remove related task"
							>
								<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
									<path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
								</svg>
							</button>
						{/if}
					</div>
				{/each}

				<!-- Token estimate -->
				{#if tokenEstimate > 0}
					<div class="token-estimate">
						~{tokenEstimate.toLocaleString()} tokens
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.context-section {
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.02);
		overflow: hidden;
	}

	.context-section.readonly {
		background: transparent;
		border-color: rgba(255, 255, 255, 0.05);
	}

	.context-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		border-bottom: 1px solid transparent;
	}

	.context-section:not(.collapsed) .context-header {
		border-bottom-color: var(--color-border, rgba(255, 255, 255, 0.1));
	}

	.header-label {
		display: flex;
		align-items: center;
		gap: 6px;
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.6));
		font-size: 13px;
		font-weight: 500;
		cursor: default;
	}

	.header-label:not(:disabled) {
		cursor: pointer;
	}

	.header-label:not(:disabled):hover {
		color: var(--color-text, rgba(255, 255, 255, 0.9));
	}

	.header-label .icon {
		font-size: 14px;
	}

	.header-label .count {
		color: var(--color-text-muted, rgba(255, 255, 255, 0.4));
		font-size: 12px;
	}

	.expand-icon {
		display: flex;
		align-items: center;
		transition: transform 0.15s ease;
	}

	.expand-icon.expanded {
		transform: rotate(180deg);
	}

	.add-button {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.6));
		font-size: 12px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.add-button:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
		color: var(--color-text, rgba(255, 255, 255, 0.9));
	}

	.context-content {
		padding: 10px 12px;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}

	.empty-state {
		color: var(--color-text-muted, rgba(255, 255, 255, 0.4));
		font-size: 13px;
		font-style: italic;
		margin: 0;
	}

	.context-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		font-size: 12px;
		max-width: 200px;
	}

	.document-chip {
		border-color: rgba(59, 130, 246, 0.3);
		background: rgba(59, 130, 246, 0.08);
	}

	.task-chip {
		border-color: rgba(168, 85, 247, 0.3);
		background: rgba(168, 85, 247, 0.08);
	}

	.chip-icon {
		font-size: 12px;
		flex-shrink: 0;
	}

	.chip-label {
		color: var(--color-text, rgba(255, 255, 255, 0.9));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chip-meta {
		color: var(--color-text-muted, rgba(255, 255, 255, 0.4));
		font-size: 10px;
		flex-shrink: 0;
	}

	.chip-status {
		font-size: 10px;
		flex-shrink: 0;
	}

	.chip-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		padding: 0;
		margin-left: 2px;
		background: none;
		border: none;
		border-radius: 50%;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.4));
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.chip-remove:hover {
		background: rgba(239, 68, 68, 0.2);
		color: rgb(239, 68, 68);
	}

	.token-estimate {
		color: var(--color-text-muted, rgba(255, 255, 255, 0.4));
		font-size: 11px;
		margin-left: auto;
		padding-left: 8px;
	}
</style>
