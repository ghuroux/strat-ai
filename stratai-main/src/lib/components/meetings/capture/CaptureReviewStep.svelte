<script lang="ts">
	/**
	 * CaptureReviewStep — Step 4 of the capture wizard
	 *
	 * Summary of what will be created: outcomes resolved, decisions
	 * to propagate, subtasks to create. User reviews before final submit.
	 */
	import { FileText, ListTodo, Lightbulb, CheckCircle, AlertTriangle, Clock } from 'lucide-svelte';
	import type { CaptureData } from '$lib/types/meeting-capture';
	import type { Meeting } from '$lib/types/meetings';

	interface Props {
		meeting: Meeting;
		captureData: CaptureData;
		hasParentTask: boolean;
	}

	let { meeting, captureData, hasParentTask }: Props = $props();

	// Computed summaries
	const resolvedOutcomes = $derived(
		captureData.outcomeResolutions.filter(r => r.status !== 'not_addressed')
	);
	const achievedCount = $derived(
		captureData.outcomeResolutions.filter(r => r.status === 'achieved').length
	);
	const partialCount = $derived(
		captureData.outcomeResolutions.filter(r => r.status === 'partial').length
	);
	const deferredCount = $derived(
		captureData.outcomeResolutions.filter(r => r.status === 'deferred').length
	);

	const confirmedDecisions = $derived(
		captureData.decisions.filter(d => d.confirmed && d.text.trim())
	);
	const decisionsToPropagate = $derived(
		confirmedDecisions.filter(d => d.propagateToContext)
	);

	const confirmedActions = $derived(
		captureData.actionItems.filter(a => a.confirmed && a.text.trim())
	);
	const subtasksToCreate = $derived(
		confirmedActions.filter(a => a.createSubtask)
	);

	const willCreatePage = $derived(!!meeting.areaId);

	const STATUS_EMOJI: Record<string, string> = {
		achieved: '\u2705',
		partial: '\u26A0\uFE0F',
		deferred: '\u23F3'
	};
</script>

<div class="space-y-5">
	<!-- Intro text -->
	<div>
		<h3 class="text-base font-medium text-zinc-900 dark:text-zinc-100">
			Review & Complete
		</h3>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Here's what will be created when you complete the capture.
		</p>
	</div>

	<!-- Summary cards -->
	<div class="space-y-3">
		<!-- Meeting Notes Page -->
		{#if willCreatePage}
			<div class="flex items-start gap-3 p-3 rounded-lg
			            bg-blue-500/5 border border-blue-500/20">
				<FileText class="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
				<div>
					<p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
						Meeting Notes Page
					</p>
					<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
						"Meeting Notes: {meeting.title}" will be created in the Area with visibility set to "area".
					</p>
				</div>
			</div>
		{/if}

		<!-- Outcomes -->
		{#if resolvedOutcomes.length > 0}
			<div class="flex items-start gap-3 p-3 rounded-lg
			            bg-green-500/5 border border-green-500/20">
				<CheckCircle class="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
				<div>
					<p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
						{resolvedOutcomes.length} Outcome{resolvedOutcomes.length !== 1 ? 's' : ''} Resolved
					</p>
					<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
						{#if achievedCount > 0}{achievedCount} achieved{/if}
						{#if partialCount > 0}{achievedCount > 0 ? ', ' : ''}{partialCount} partial{/if}
						{#if deferredCount > 0}{(achievedCount > 0 || partialCount > 0) ? ', ' : ''}{deferredCount} deferred{/if}
					</p>
				</div>
			</div>
		{/if}

		<!-- Decisions -->
		{#if confirmedDecisions.length > 0}
			<div class="flex items-start gap-3 p-3 rounded-lg
			            bg-amber-500/5 border border-amber-500/20">
				<Lightbulb class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
				<div>
					<p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
						{confirmedDecisions.length} Decision{confirmedDecisions.length !== 1 ? 's' : ''} Recorded
					</p>
					{#if decisionsToPropagate.length > 0}
						<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
							{decisionsToPropagate.length} will be added to Area context
						</p>
					{/if}
					<ul class="mt-1.5 space-y-1">
						{#each confirmedDecisions as decision (decision.id)}
							<li class="text-xs text-zinc-600 dark:text-zinc-300">
								• {decision.text}
								{#if decision.propagateToContext}
									<span class="text-primary-500">(→ context)</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}

		<!-- Action Items / Subtasks -->
		{#if confirmedActions.length > 0}
			<div class="flex items-start gap-3 p-3 rounded-lg
			            bg-purple-500/5 border border-purple-500/20">
				<ListTodo class="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
				<div>
					<p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
						{confirmedActions.length} Action Item{confirmedActions.length !== 1 ? 's' : ''}
					</p>
					{#if hasParentTask && subtasksToCreate.length > 0}
						<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
							{subtasksToCreate.length} will be created as subtasks
						</p>
					{/if}
					<ul class="mt-1.5 space-y-1">
						{#each confirmedActions as action (action.id)}
							<li class="text-xs text-zinc-600 dark:text-zinc-300">
								• {action.text}
								{#if action.assigneeName}
									<span class="text-zinc-500">— @{action.assigneeName}</span>
								{/if}
								{#if action.createSubtask && hasParentTask}
									<span class="text-purple-500">(subtask)</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}

		<!-- Nothing notable case -->
		{#if resolvedOutcomes.length === 0 && confirmedDecisions.length === 0 && confirmedActions.length === 0}
			<div class="text-center py-6 text-sm text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg">
				{#if willCreatePage}
					A meeting notes page will be created with the summary.
				{:else}
					The meeting will be marked as captured.
				{/if}
			</div>
		{/if}
	</div>

	<!-- Summary preview if provided -->
	{#if captureData.summary}
		<div class="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
			<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Summary</p>
			<p class="text-sm text-zinc-700 dark:text-zinc-300">{captureData.summary}</p>
		</div>
	{/if}
</div>
