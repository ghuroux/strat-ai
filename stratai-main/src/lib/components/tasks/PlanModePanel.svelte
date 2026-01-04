<script lang="ts">
	import { fly, slide } from 'svelte/transition';
	import type { PlanModeState, ProposedSubtask } from '$lib/types/tasks';
	import type { TaskContextInfo } from '$lib/utils/context-builder';
	import { estimateTokens } from '$lib/utils/context-builder';

	interface Props {
		planMode: PlanModeState;
		context?: TaskContextInfo;
		onClose: () => void;
		onCreateSubtasks: () => void;
		onUpdateSubtask: (id: string, title: string) => void;
		onToggleSubtask: (id: string) => void;
		onRemoveSubtask: (id: string) => void;
		onAddSubtask: () => void;
		onRequestProposal?: () => void; // User signals ready for suggestions
	}

	let {
		planMode,
		context,
		onClose,
		onCreateSubtasks,
		onUpdateSubtask,
		onToggleSubtask,
		onRemoveSubtask,
		onAddSubtask,
		onRequestProposal
	}: Props = $props();

	// Context section state
	let contextExpanded = $state(false);

	// Context calculations
	let hasContext = $derived(
		(context?.documents?.length ?? 0) > 0 || (context?.relatedTasks?.length ?? 0) > 0
	);

	let totalChars = $derived.by(() => {
		if (!context) return 0;
		let chars = 0;
		if (context.documents) {
			for (const doc of context.documents) {
				chars += doc.charCount;
			}
		}
		if (context.relatedTasks) {
			for (const rt of context.relatedTasks) {
				chars += rt.title.length + (rt.contextSummary?.length ?? 0) + 100;
			}
		}
		return chars;
	});

	let tokenCount = $derived(estimateTokens(totalChars));

	// Edit mode state
	let editingId: string | null = $state(null);
	let editingText = $state('');

	// Get phase-specific messaging
	let phaseTitle = $derived.by(() => {
		switch (planMode.phase) {
			case 'eliciting':
				return 'Planning';
			case 'proposing':
				return 'Planning';
			case 'confirming':
				return 'Review Breakdown';
			default:
				return 'Plan Mode';
		}
	});

	let phaseSubtitle = $derived.by(() => {
		switch (planMode.phase) {
			case 'eliciting':
				return 'Gathering context...';
			case 'proposing':
				return 'Creating breakdown...';
			case 'confirming':
				return 'Edit or confirm these subtasks';
			default:
				return '';
		}
	});

	// Confirmed count for button
	let confirmedCount = $derived(planMode.proposedSubtasks.filter((s) => s.confirmed).length);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (editingId) {
				cancelEdit();
			} else {
				onClose();
			}
		}
	}

	function startEditing(subtask: ProposedSubtask) {
		editingId = subtask.id;
		editingText = subtask.title;
	}

	function saveEdit() {
		if (editingId && editingText.trim()) {
			onUpdateSubtask(editingId, editingText.trim());
		}
		cancelEdit();
	}

	function cancelEdit() {
		editingId = null;
		editingText = '';
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveEdit();
		} else if (e.key === 'Escape') {
			cancelEdit();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<aside
	class="plan-mode-panel w-[40vw] min-w-80 h-full flex flex-col bg-surface-900/95 backdrop-blur-sm border-l border-surface-700 shadow-2xl"
	transition:fly={{ x: 600, duration: 300, opacity: 1 }}
>
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-surface-700">
		<div class="flex items-center gap-3">
			<div
				class="w-9 h-9 rounded-xl flex items-center justify-center"
				style="background: var(--space-accent-muted, rgba(59, 130, 246, 0.15));"
			>
				<svg
					class="w-5 h-5"
					style="color: var(--space-accent, #3b82f6);"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
					/>
				</svg>
			</div>
			<div>
				<span class="font-semibold text-surface-100">{phaseTitle}</span>
				{#if phaseSubtitle}
					<p class="text-xs text-surface-500">{phaseSubtitle}</p>
				{/if}
			</div>
		</div>

		<button
			type="button"
			onclick={onClose}
			class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
			title="Exit Plan Mode (Esc)"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</div>

	<!-- Phase Indicator -->
	<div class="flex items-center gap-2 px-4 py-2 border-b border-surface-800 bg-surface-800/20">
		{#if planMode.phase === 'eliciting'}
			<div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
			<span class="text-xs text-surface-400">Understanding your task...</span>
			{#if (planMode.exchangeCount || 0) > 0}
				<span class="text-xs text-surface-600">• {planMode.exchangeCount} exchange{(planMode.exchangeCount || 0) !== 1 ? 's' : ''}</span>
			{/if}
		{:else if planMode.phase === 'proposing'}
			<div class="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
			<span class="text-xs text-surface-400">Creating breakdown...</span>
		{:else}
			<div class="w-2 h-2 rounded-full bg-green-500"></div>
			<span class="text-xs text-surface-400">Review & confirm</span>
		{/if}
	</div>

	<!-- Request Breakdown Action (visible after 2+ exchanges in eliciting) -->
	{#if planMode.phase === 'eliciting' && (planMode.exchangeCount || 0) >= 2 && onRequestProposal}
		<div class="px-4 py-3 border-b border-surface-800 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
			<button
				type="button"
				onclick={onRequestProposal}
				class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
					   bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium
					   hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/20"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
				Create Breakdown
			</button>
			<p class="text-xs text-surface-500 text-center mt-2">
				Or say "yes" / "go ahead" in the chat
			</p>
		</div>
	{/if}

	<!-- Task Context -->
	<div class="px-4 py-3 border-b border-surface-800 bg-surface-800/30">
		<p class="text-xs text-surface-500 uppercase tracking-wider mb-1">Planning for</p>
		<p class="text-sm text-surface-200 font-medium">{planMode.taskTitle}</p>
	</div>

	<!-- Linked Context -->
	{#if hasContext}
		<div class="border-b border-surface-800">
			<button
				type="button"
				class="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-surface-800/30 transition-colors"
				onclick={() => contextExpanded = !contextExpanded}
			>
				<span class="flex items-center gap-2 text-xs text-surface-500">
					<span class="text-sm">📎</span>
					<span>
						{(context?.documents?.length ?? 0)} doc{(context?.documents?.length ?? 0) !== 1 ? 's' : ''},
						{(context?.relatedTasks?.length ?? 0)} task{(context?.relatedTasks?.length ?? 0) !== 1 ? 's' : ''}
					</span>
					<span class="text-surface-600">•</span>
					<span>~{tokenCount.toLocaleString()} tokens</span>
				</span>
				<svg
					class="w-4 h-4 text-surface-500 transition-transform duration-150"
					class:rotate-180={contextExpanded}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{#if contextExpanded}
				<div class="px-4 pb-3 flex flex-wrap gap-1.5" transition:slide={{ duration: 150 }}>
					{#if context?.documents}
						{#each context.documents as doc (doc.id)}
							<span class="context-chip doc-chip">
								📄 {doc.filename}
							</span>
						{/each}
					{/if}
					{#if context?.relatedTasks}
						{#each context.relatedTasks as rt (rt.id)}
							<span class="context-chip task-chip">
								🔗 {rt.title}
							</span>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Content Area -->
	<div class="flex-1 overflow-y-auto p-4">
		{#if planMode.phase !== 'confirming' || planMode.proposedSubtasks.length === 0}
			<!-- Waiting State -->
			<div class="flex flex-col items-center justify-center h-full text-center px-4">
				<div class="w-14 h-14 rounded-full bg-surface-800 flex items-center justify-center mb-4 animate-pulse">
					<svg class="w-7 h-7 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<p class="text-sm text-surface-400 mb-1">Chat with the AI to plan your task</p>
				<p class="text-xs text-surface-500 mb-4">Subtasks will appear here once proposed</p>

				<!-- Ready for suggestions button - appears after first exchange -->
				{#if planMode.phase === 'eliciting' && (planMode.exchangeCount || 0) >= 1 && onRequestProposal}
					<button
						type="button"
						onclick={onRequestProposal}
						class="text-sm text-surface-400 hover:text-white transition-colors underline underline-offset-4 decoration-surface-600 hover:decoration-surface-400"
					>
						Ready for suggestions →
					</button>
				{/if}
			</div>
		{:else}
			<!-- Proposed Subtasks List -->
			<div class="space-y-2">
				{#each planMode.proposedSubtasks as subtask (subtask.id)}
					<div
						class="subtask-item group relative rounded-xl border transition-all duration-200
							   {subtask.confirmed
							? 'bg-surface-800/50 border-surface-700'
							: 'bg-surface-800/20 border-surface-700/50 opacity-60'}"
					>
						{#if editingId === subtask.id}
							<!-- Edit Mode -->
							<div class="p-3">
								<input
									type="text"
									bind:value={editingText}
									onkeydown={handleEditKeydown}
									class="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
										   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
									autofocus
								/>
								<div class="flex gap-2 mt-2">
									<button
										type="button"
										onclick={saveEdit}
										class="px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600"
									>
										Save
									</button>
									<button
										type="button"
										onclick={cancelEdit}
										class="px-3 py-1.5 text-xs font-medium bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600"
									>
										Cancel
									</button>
								</div>
							</div>
						{:else}
							<!-- Display Mode -->
							<div class="flex items-start gap-3 p-3">
								<!-- Checkbox -->
								<button
									type="button"
									onclick={() => onToggleSubtask(subtask.id)}
									class="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors
										   {subtask.confirmed
										? 'bg-primary-500 border-primary-500'
										: 'border-surface-600 hover:border-surface-500'}"
								>
									{#if subtask.confirmed}
										<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</button>

								<!-- Title -->
								<div class="flex-1 min-w-0">
									<p class="text-sm text-surface-200 leading-relaxed">{subtask.title}</p>
									<span class="inline-flex items-center gap-1 mt-1 text-xs text-surface-500">
										{#if subtask.type === 'conversation'}
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
											</svg>
											AI-assisted
										{:else}
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
											Action item
										{/if}
									</span>
								</div>

								<!-- Edit/Remove buttons -->
								<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										type="button"
										onclick={() => startEditing(subtask)}
										class="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700"
										title="Edit"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
										</svg>
									</button>
									<button
										type="button"
										onclick={() => onRemoveSubtask(subtask.id)}
										class="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-surface-700"
										title="Remove"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}

				<!-- Add Another Button -->
				<button
					type="button"
					onclick={onAddSubtask}
					class="w-full p-3 rounded-xl border border-dashed border-surface-700 text-surface-500
						   hover:border-surface-600 hover:text-surface-400 hover:bg-surface-800/30 transition-all
						   flex items-center justify-center gap-2 text-sm"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Add another
				</button>
			</div>
		{/if}
	</div>

	<!-- Action Buttons -->
	{#if planMode.phase === 'confirming' && planMode.proposedSubtasks.length > 0}
		<div class="p-4 border-t border-surface-700 space-y-2">
			<button
				type="button"
				onclick={onCreateSubtasks}
				disabled={confirmedCount === 0}
				class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
					   text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
				style="background: var(--space-accent, #3b82f6);"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
				Create {confirmedCount} Subtask{confirmedCount !== 1 ? 's' : ''}
			</button>

			<button
				type="button"
				onclick={onClose}
				class="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-sm
					   bg-surface-700 text-surface-300 hover:bg-surface-600 transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
				</svg>
				Keep refining
			</button>
		</div>
	{/if}

	<!-- Hint -->
	<div class="px-4 py-2 border-t border-surface-800 text-center">
		<span class="text-xs text-surface-500">Press Esc to exit plan mode</span>
	</div>
</aside>

<style>
	.plan-mode-panel {
		box-shadow:
			-4px 0 24px rgba(0, 0, 0, 0.3),
			inset 1px 0 0 rgba(255, 255, 255, 0.05);
	}

	/* Smooth scrollbar */
	.plan-mode-panel :global(::-webkit-scrollbar) {
		width: 6px;
	}

	.plan-mode-panel :global(::-webkit-scrollbar-track) {
		background: transparent;
	}

	.plan-mode-panel :global(::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.plan-mode-panel :global(::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Subtask item hover */
	.subtask-item:not(:has(input)):hover {
		transform: translateX(-2px);
	}

	/* Context chips */
	.context-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		font-size: 11px;
		border-radius: 12px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 150px;
	}

	.doc-chip {
		background: rgba(59, 130, 246, 0.1);
		color: rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(59, 130, 246, 0.2);
	}

	.task-chip {
		background: rgba(168, 85, 247, 0.1);
		color: rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(168, 85, 247, 0.2);
	}
</style>
