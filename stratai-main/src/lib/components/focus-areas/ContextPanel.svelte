<script lang="ts">
	/**
	 * ContextPanel - Shows the current context chain
	 *
	 * Displays a visual indicator of what context is active:
	 * - Space context
	 * - Focus Area context (if selected)
	 * - Task context (if focused)
	 *
	 * Collapsible to show/hide context details
	 */
	import type { FocusArea } from '$lib/types/focus-areas';
	import type { SpaceType } from '$lib/types/chat';

	interface Props {
		space: SpaceType;
		focusArea?: FocusArea | null;
		taskTitle?: string | null;
		onEditFocusArea?: () => void;
		compact?: boolean; // Compact mode for header display
	}

	let {
		space,
		focusArea = null,
		taskTitle = null,
		onEditFocusArea,
		compact = false
	}: Props = $props();

	let expanded = $state(false);

	// Space display info
	const spaceInfo: Record<SpaceType, { label: string; color: string }> = {
		work: { label: 'Work', color: '#3b82f6' },
		research: { label: 'Research', color: '#a855f7' },
		random: { label: 'Random', color: '#f97316' },
		personal: { label: 'Personal', color: '#22c55e' }
	};

	let currentSpace = $derived(spaceInfo[space]);
	let hasContext = $derived(focusArea?.context && focusArea.context.length > 0);
	let contextPreview = $derived(
		focusArea?.context
			? focusArea.context.length > 100
				? focusArea.context.slice(0, 100) + '...'
				: focusArea.context
			: null
	);

	function toggleExpanded() {
		if (!compact) {
			expanded = !expanded;
		}
	}
</script>

{#if compact}
	<!-- Compact mode: Just show badges -->
	<div class="context-compact">
		<span class="context-badge space-badge" style="--badge-color: {currentSpace.color}">
			{currentSpace.label}
		</span>
		{#if focusArea}
			<span class="context-separator">›</span>
			<span
				class="context-badge focus-badge"
				style="--badge-color: {focusArea.color || currentSpace.color}"
			>
				{focusArea.name}
				{#if hasContext}
					<span class="context-dot" title="Has context">•</span>
				{/if}
			</span>
		{/if}
		{#if taskTitle}
			<span class="context-separator">›</span>
			<span class="context-badge task-badge">
				{taskTitle}
			</span>
		{/if}
	</div>
{:else}
	<!-- Full mode: Expandable panel -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="context-panel" class:expanded class:has-context={hasContext}>
		<!-- Header -->
		<div class="panel-header" onclick={toggleExpanded}>
			<div class="context-chain">
				<span class="context-badge space-badge" style="--badge-color: {currentSpace.color}">
					{currentSpace.label}
				</span>
				{#if focusArea}
					<span class="context-separator">›</span>
					<span
						class="context-badge focus-badge"
						style="--badge-color: {focusArea.color || currentSpace.color}"
					>
						{focusArea.name}
						{#if hasContext}
							<span class="context-dot" title="Has context">•</span>
						{/if}
					</span>
				{/if}
				{#if taskTitle}
					<span class="context-separator">›</span>
					<span class="context-badge task-badge">
						{taskTitle}
					</span>
				{/if}
			</div>

			{#if hasContext}
				<button
					type="button"
					class="expand-button"
					aria-label={expanded ? 'Collapse context' : 'Expand context'}
				>
					<svg
						class="expand-icon"
						class:rotated={expanded}
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</button>
			{/if}
		</div>

		<!-- Expanded content -->
		{#if expanded && hasContext}
			<div class="panel-content">
				<div class="context-text">
					<h4 class="context-label">Focus Area Context</h4>
					<p class="context-body">{focusArea?.context}</p>
				</div>
				{#if onEditFocusArea}
					<button
						type="button"
						class="edit-button"
						onclick={onEditFocusArea}
					>
						<svg class="edit-icon" viewBox="0 0 20 20" fill="currentColor">
							<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
						</svg>
						Edit
					</button>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Compact mode */
	.context-compact {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	/* Full panel */
	.context-panel {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		overflow: hidden;
		transition: all 0.2s ease;
	}

	.context-panel.has-context {
		cursor: pointer;
	}

	.context-panel.has-context:hover {
		border-color: rgba(255, 255, 255, 0.15);
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.625rem 0.875rem;
	}

	.context-chain {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.context-separator {
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.75rem;
	}

	.context-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: 0.25rem;
		line-height: 1;
	}

	.space-badge {
		background: color-mix(in srgb, var(--badge-color) 15%, transparent);
		color: var(--badge-color);
	}

	.focus-badge {
		background: color-mix(in srgb, var(--badge-color) 15%, transparent);
		color: var(--badge-color);
	}

	.task-badge {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
		max-width: 10rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.context-dot {
		font-size: 0.875rem;
		line-height: 1;
	}

	.expand-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		color: rgba(255, 255, 255, 0.4);
		border-radius: 0.25rem;
		transition: all 0.15s ease;
	}

	.expand-button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
	}

	.expand-icon {
		width: 1rem;
		height: 1rem;
		transition: transform 0.2s ease;
	}

	.expand-icon.rotated {
		transform: rotate(180deg);
	}

	/* Expanded content */
	.panel-content {
		padding: 0.75rem 0.875rem;
		padding-top: 0;
	}

	.context-text {
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 0.375rem;
		margin-bottom: 0.75rem;
	}

	.context-label {
		font-size: 0.6875rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem 0;
	}

	.context-body {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.5;
		white-space: pre-wrap;
		margin: 0;
	}

	.edit-button {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.25rem;
		transition: all 0.15s ease;
	}

	.edit-button:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.9);
	}

	.edit-icon {
		width: 0.75rem;
		height: 0.75rem;
	}
</style>
