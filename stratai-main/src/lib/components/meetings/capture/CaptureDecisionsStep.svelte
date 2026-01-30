<script lang="ts">
	/**
	 * CaptureDecisionsStep — Step 2 of the capture wizard
	 *
	 * Pre-populated from achieved decision-type outcomes.
	 * Users can add additional decisions, set owners, rationale,
	 * and toggle "propagate to area context".
	 */
	import { Plus, X, ChevronDown } from 'lucide-svelte';
	import type { CaptureDecision } from '$lib/types/meeting-capture';
	import type { MeetingAttendee } from '$lib/types/meetings';

	interface Props {
		decisions: CaptureDecision[];
		attendees: MeetingAttendee[];
		onDecisionsChange: (decisions: CaptureDecision[]) => void;
	}

	let { decisions, attendees, onDecisionsChange }: Props = $props();

	function generateId(): string {
		return `dec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
	}

	function addDecision() {
		onDecisionsChange([
			...decisions,
			{
				id: generateId(),
				text: '',
				rationale: undefined,
				ownerId: undefined,
				outcomeId: undefined,
				propagateToContext: true,
				confirmed: true
			}
		]);
	}

	function removeDecision(id: string) {
		onDecisionsChange(decisions.filter(d => d.id !== id));
	}

	function updateDecision(id: string, field: keyof CaptureDecision, value: unknown) {
		onDecisionsChange(
			decisions.map(d => (d.id === id ? { ...d, [field]: value } : d))
		);
	}
</script>

<div class="space-y-5">
	<!-- Intro text -->
	<div>
		<h3 class="text-base font-medium text-zinc-900 dark:text-zinc-100">
			Decisions made
		</h3>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Record any decisions from this meeting. Confirmed decisions can be propagated to your Area context.
		</p>
	</div>

	<!-- Decision cards -->
	{#if decisions.length > 0}
		<div class="space-y-4">
			{#each decisions as decision, index (decision.id)}
				<div class="rounded-lg border border-zinc-200 dark:border-zinc-700
				            bg-white dark:bg-zinc-800/50 p-4 space-y-3">
					<!-- Header with remove button -->
					<div class="flex items-start justify-between gap-2">
						<span class="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
							Decision {index + 1}
						</span>
						<button
							type="button"
							onclick={() => removeDecision(decision.id)}
							class="p-1 rounded text-zinc-400 hover:text-red-500
							       hover:bg-red-500/10 transition-all duration-150"
							aria-label="Remove decision"
						>
							<X class="w-4 h-4" />
						</button>
					</div>

					<!-- Decision text -->
					<input
						type="text"
						value={decision.text}
						oninput={(e) => updateDecision(decision.id, 'text', e.currentTarget.value)}
						placeholder="What was decided?"
						class="w-full px-3 py-2 text-sm rounded-lg
						       bg-zinc-50 dark:bg-zinc-800
						       border border-zinc-200 dark:border-zinc-600
						       text-zinc-900 dark:text-zinc-100
						       placeholder:text-zinc-400 dark:placeholder:text-zinc-500
						       focus:outline-none focus:ring-2 focus:ring-primary-500/30"
					/>

					<!-- Rationale -->
					<input
						type="text"
						value={decision.rationale || ''}
						oninput={(e) => updateDecision(decision.id, 'rationale', e.currentTarget.value || undefined)}
						placeholder="Rationale (optional)"
						class="w-full px-3 py-1.5 text-sm rounded-lg
						       bg-zinc-50 dark:bg-zinc-800
						       border border-zinc-200 dark:border-zinc-600
						       text-zinc-900 dark:text-zinc-100
						       placeholder:text-zinc-400 dark:placeholder:text-zinc-500
						       focus:outline-none focus:ring-2 focus:ring-primary-500/30"
					/>

					<!-- Owner + Propagate toggles row -->
					<div class="flex items-center gap-4 flex-wrap">
						<!-- Owner dropdown -->
						<div class="flex items-center gap-2">
							<label for="decision-owner-{decision.id}" class="text-xs text-zinc-500 dark:text-zinc-400">
								Owner:
							</label>
							<div class="relative">
								<select
									id="decision-owner-{decision.id}"
									value={decision.ownerId || ''}
									onchange={(e) => updateDecision(decision.id, 'ownerId', e.currentTarget.value || undefined)}
									class="appearance-none pl-3 pr-7 py-1 text-sm rounded-lg
									       bg-zinc-50 dark:bg-zinc-800
									       border border-zinc-200 dark:border-zinc-600
									       text-zinc-900 dark:text-zinc-100
									       focus:outline-none focus:ring-2 focus:ring-primary-500/30"
								>
									<option value="">Unassigned</option>
									{#each attendees as attendee (attendee.id)}
										<option value={attendee.userId || attendee.id}>
											{attendee.displayName || attendee.email}
										</option>
									{/each}
								</select>
								<ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
							</div>
						</div>

						<!-- Propagate toggle -->
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={decision.propagateToContext}
								onchange={(e) => updateDecision(decision.id, 'propagateToContext', e.currentTarget.checked)}
								class="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600
								       text-primary-500 focus:ring-primary-500/30"
							/>
							<span class="text-xs text-zinc-500 dark:text-zinc-400">
								Add to Area context
							</span>
						</label>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-6 text-sm text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg">
			No decisions recorded yet.
		</div>
	{/if}

	<!-- Add decision button -->
	<button
		type="button"
		onclick={addDecision}
		class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
		       text-primary-600 dark:text-primary-400
		       hover:bg-primary-500/10
		       transition-all duration-150"
	>
		<Plus class="w-4 h-4" />
		Add Decision
	</button>
</div>
