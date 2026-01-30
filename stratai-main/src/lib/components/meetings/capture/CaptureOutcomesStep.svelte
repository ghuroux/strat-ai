<script lang="ts">
	/**
	 * CaptureOutcomesStep — Step 1 of the capture wizard (The Bridge)
	 *
	 * Pre-populated from meeting.expectedOutcomes, each outcome is
	 * rendered as a toggleable card with status selection. This is the
	 * "bridge moment" — user sees the goals they set at creation and
	 * confirms what actually happened.
	 */
	import { Check, Circle, AlertTriangle, Clock } from 'lucide-svelte';
	import type { OutcomeResolution, OutcomeResolutionStatus } from '$lib/types/meeting-capture';
	import type { ExpectedOutcome } from '$lib/types/meetings';

	interface Props {
		expectedOutcomes: ExpectedOutcome[];
		resolutions: OutcomeResolution[];
		summary: string;
		onResolutionsChange: (resolutions: OutcomeResolution[]) => void;
		onSummaryChange: (summary: string) => void;
	}

	let {
		expectedOutcomes,
		resolutions,
		summary,
		onResolutionsChange,
		onSummaryChange
	}: Props = $props();

	const STATUS_OPTIONS: { value: OutcomeResolutionStatus; label: string; icon: typeof Check; color: string }[] = [
		{ value: 'achieved', label: 'Achieved', icon: Check, color: 'text-green-500' },
		{ value: 'partial', label: 'Partial', icon: AlertTriangle, color: 'text-amber-500' },
		{ value: 'deferred', label: 'Deferred', icon: Clock, color: 'text-blue-500' },
		{ value: 'not_addressed', label: 'Not Addressed', icon: Circle, color: 'text-zinc-400' }
	];

	const OUTCOME_TYPE_LABELS: Record<string, string> = {
		decision: 'Decision',
		action_item: 'Action Item',
		information: 'Information',
		custom: 'Custom'
	};

	function setStatus(outcomeId: string, status: OutcomeResolutionStatus) {
		const outcome = expectedOutcomes.find(o => o.id === outcomeId);
		if (!outcome) return;

		const updated = resolutions.map(r =>
			r.outcomeId === outcomeId ? { ...r, status } : r
		);
		// Add resolution if not yet present
		if (!updated.find(r => r.outcomeId === outcomeId)) {
			updated.push({
				outcomeId,
				label: outcome.label,
				status,
				notes: undefined
			});
		}
		onResolutionsChange(updated);
	}

	function setNotes(outcomeId: string, notes: string) {
		const updated = resolutions.map(r =>
			r.outcomeId === outcomeId ? { ...r, notes: notes || undefined } : r
		);
		onResolutionsChange(updated);
	}

	function getResolution(outcomeId: string): OutcomeResolution | undefined {
		return resolutions.find(r => r.outcomeId === outcomeId);
	}
</script>

<div class="space-y-5">
	<!-- Intro text -->
	<div>
		<h3 class="text-base font-medium text-zinc-900 dark:text-zinc-100">
			What happened?
		</h3>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Review the outcomes you set when creating this meeting. What was achieved?
		</p>
	</div>

	<!-- Outcome cards -->
	{#if expectedOutcomes.length > 0}
		<div class="space-y-3">
			{#each expectedOutcomes as outcome (outcome.id)}
				{@const resolution = getResolution(outcome.id)}
				<div class="rounded-lg border transition-all duration-150
				            {resolution?.status === 'achieved' ? 'border-green-500/30 bg-green-500/5 dark:bg-green-500/5' :
				             resolution?.status === 'partial' ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/5' :
				             resolution?.status === 'deferred' ? 'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/5' :
				             'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50'}">
					<div class="p-4">
						<!-- Outcome label + type badge -->
						<div class="flex items-start justify-between gap-3 mb-3">
							<span class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
								{outcome.label}
							</span>
							<span class="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full
							             bg-zinc-100 dark:bg-zinc-700
							             text-zinc-500 dark:text-zinc-400">
								{OUTCOME_TYPE_LABELS[outcome.type] || outcome.type}
							</span>
						</div>

						<!-- Status toggle pills -->
						<div class="flex flex-wrap gap-2">
							{#each STATUS_OPTIONS as option (option.value)}
								{@const isSelected = resolution?.status === option.value}
								<button
									type="button"
									onclick={() => setStatus(outcome.id, option.value)}
									class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
									       transition-all duration-150
									       {isSelected
									         ? `${option.color} bg-current/10 ring-1 ring-current/30`
									         : 'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700/50 hover:bg-zinc-200 dark:hover:bg-zinc-600/50'}"
								>
									<svelte:component this={option.icon} class="w-3.5 h-3.5" />
									{option.label}
								</button>
							{/each}
						</div>

						<!-- Notes (show when status is set and not 'not_addressed') -->
						{#if resolution && resolution.status !== 'not_addressed'}
							<div class="mt-3">
								<input
									type="text"
									value={resolution.notes || ''}
									oninput={(e) => setNotes(outcome.id, e.currentTarget.value)}
									placeholder="Optional notes..."
									class="w-full px-3 py-1.5 text-sm rounded-lg
									       bg-zinc-50 dark:bg-zinc-800
									       border border-zinc-200 dark:border-zinc-600
									       text-zinc-900 dark:text-zinc-100
									       placeholder:text-zinc-400 dark:placeholder:text-zinc-500
									       focus:outline-none focus:ring-2 focus:ring-primary-500/30"
								/>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-6 text-sm text-zinc-500 dark:text-zinc-400">
			No expected outcomes were set for this meeting.
		</div>
	{/if}

	<!-- Summary textarea -->
	<div>
		<label for="capture-summary" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
			Meeting summary
			<span class="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
		</label>
		<textarea
			id="capture-summary"
			value={summary}
			oninput={(e) => onSummaryChange(e.currentTarget.value)}
			placeholder="Brief summary of what happened in this meeting..."
			rows={3}
			class="w-full px-3 py-2 text-sm rounded-lg resize-none
			       bg-zinc-50 dark:bg-zinc-800
			       border border-zinc-200 dark:border-zinc-600
			       text-zinc-900 dark:text-zinc-100
			       placeholder:text-zinc-400 dark:placeholder:text-zinc-500
			       focus:outline-none focus:ring-2 focus:ring-primary-500/30"
		></textarea>
	</div>
</div>
