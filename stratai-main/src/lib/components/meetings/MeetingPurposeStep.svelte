<script lang="ts">
	/**
	 * MeetingPurposeStep — Step 1: Purpose, Subject & Outcomes
	 *
	 * Text input for meeting purpose, subject line (with AI derive),
	 * AI-suggested outcomes, and manual outcome entry with type selector.
	 */
	import { Sparkles, X, Plus, Loader2 } from 'lucide-svelte';
	import type { WizardOutcome } from '$lib/types/meeting-wizard';

	interface Props {
		title: string;
		purpose: string;
		outcomes: WizardOutcome[];
		areaId: string;
		areaName: string;
		onTitleChange: (value: string) => void;
		onPurposeChange: (value: string) => void;
		onOutcomesChange: (outcomes: WizardOutcome[]) => void;
	}

	let {
		title,
		purpose,
		outcomes,
		areaId,
		areaName,
		onTitleChange,
		onPurposeChange,
		onOutcomesChange
	}: Props = $props();

	// Local state
	let isLoadingSuggestions = $state(false);
	let isLoadingTitle = $state(false);
	let customLabel = $state('');
	let customType = $state<'decision' | 'action_item' | 'information' | 'custom'>('custom');
	let showCustomInput = $state(false);

	const canSuggest = $derived(purpose.trim().length > 0 && !isLoadingSuggestions);
	const canSuggestTitle = $derived(purpose.trim().length > 0 && !isLoadingTitle);

	async function handleAISuggestTitle() {
		if (!canSuggestTitle) return;
		isLoadingTitle = true;

		try {
			const response = await fetch('/api/meetings/suggest-title', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ purpose: purpose.trim() })
			});

			if (!response.ok) return;

			const data = await response.json();
			if (data.title) {
				onTitleChange(data.title);
			}
		} catch (err) {
			console.error('Failed to suggest title:', err);
		} finally {
			isLoadingTitle = false;
		}
	}

	async function handleAISuggest() {
		if (!canSuggest) return;
		isLoadingSuggestions = true;

		try {
			const response = await fetch('/api/meetings/suggest-outcomes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ areaId, purpose: purpose.trim() })
			});

			if (!response.ok) return;

			const data = await response.json();
			if (!data.outcomes || data.outcomes.length === 0) return;

			const newOutcomes: WizardOutcome[] = data.outcomes.map((o: { label: string; type: string; reason?: string; sourceTaskId?: string }) => ({
				id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
				label: o.label,
				type: o.type as WizardOutcome['type'],
				aiSuggested: true,
				aiReason: o.reason,
				sourceTaskId: o.sourceTaskId,
				selected: true
			}));

			onOutcomesChange([...outcomes, ...newOutcomes]);
		} catch (err) {
			console.error('Failed to fetch AI suggestions:', err);
		} finally {
			isLoadingSuggestions = false;
		}
	}

	function handleAddCustom() {
		if (!customLabel.trim()) return;

		const outcome: WizardOutcome = {
			id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			label: customLabel.trim(),
			type: customType,
			aiSuggested: false,
			selected: true
		};

		onOutcomesChange([...outcomes, outcome]);
		customLabel = '';
		customType = 'custom';
		showCustomInput = false;
	}

	function handleRemoveOutcome(id: string) {
		onOutcomesChange(outcomes.filter(o => o.id !== id));
	}

	function handleToggleOutcome(id: string) {
		onOutcomesChange(outcomes.map(o => o.id === id ? { ...o, selected: !o.selected } : o));
	}

	function handleCustomKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddCustom();
		}
		if (e.key === 'Escape') {
			showCustomInput = false;
			customLabel = '';
		}
	}

	const typeLabels: Record<WizardOutcome['type'], string> = {
		decision: 'Decision',
		action_item: 'Action Item',
		information: 'Information',
		custom: 'Custom'
	};

	const typeColors: Record<WizardOutcome['type'], string> = {
		decision: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
		action_item: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
		information: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
		custom: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
	};
</script>

<div class="space-y-6">
	<!-- Purpose input -->
	<div class="space-y-2">
		<label for="meeting-purpose" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
			What's this meeting about?
		</label>
		<input
			id="meeting-purpose"
			type="text"
			value={purpose}
			oninput={(e) => onPurposeChange(e.currentTarget.value)}
			placeholder="e.g. Sprint planning for Q1 launch, Weekly sync on marketing campaign..."
			class="w-full px-4 py-3 rounded-lg
			       bg-zinc-50 dark:bg-zinc-800/50
			       border border-zinc-200 dark:border-zinc-700
			       text-zinc-900 dark:text-zinc-100
			       placeholder:text-zinc-400 dark:placeholder:text-zinc-500
			       focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
			       transition-all duration-150"
		/>
	</div>

	<!-- Subject line -->
	<div class="space-y-2">
		<label for="meeting-title" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
			Subject line
		</label>
		<div class="flex gap-2">
			<input
				id="meeting-title"
				type="text"
				value={title}
				oninput={(e) => onTitleChange(e.currentTarget.value)}
				placeholder="Short title for calendar invite..."
				maxlength={100}
				class="flex-1 px-4 py-2.5 rounded-lg text-sm
				       bg-zinc-50 dark:bg-zinc-800/50
				       border border-zinc-200 dark:border-zinc-700
				       text-zinc-900 dark:text-zinc-100
				       placeholder:text-zinc-400 dark:placeholder:text-zinc-500
				       focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
				       transition-all duration-150"
			/>
			<button
				type="button"
				disabled={!canSuggestTitle}
				onclick={handleAISuggestTitle}
				class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
				       bg-primary-500/10 text-primary-600 dark:text-primary-400
				       border border-primary-500/20
				       hover:bg-primary-500/20 hover:border-primary-500/30
				       disabled:opacity-40 disabled:cursor-not-allowed
				       transition-all duration-150 whitespace-nowrap"
				title="Generate subject from description"
			>
				{#if isLoadingTitle}
					<Loader2 class="w-3.5 h-3.5 animate-spin" />
				{:else}
					<Sparkles class="w-3.5 h-3.5" />
				{/if}
				Suggest
			</button>
		</div>
		<p class="text-xs text-zinc-400 dark:text-zinc-500">
			Used as the calendar event subject and meeting title
		</p>
	</div>

	<!-- Outcomes section -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
				Expected Outcomes
			</label>
			<button
				type="button"
				disabled={!canSuggest}
				onclick={handleAISuggest}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
				       bg-primary-500/10 text-primary-600 dark:text-primary-400
				       border border-primary-500/20
				       hover:bg-primary-500/20 hover:border-primary-500/30
				       disabled:opacity-40 disabled:cursor-not-allowed
				       transition-all duration-150"
			>
				{#if isLoadingSuggestions}
					<Loader2 class="w-3.5 h-3.5 animate-spin" />
					Suggesting...
				{:else}
					<Sparkles class="w-3.5 h-3.5" />
					AI Suggest
				{/if}
			</button>
		</div>

		<!-- Loading skeleton -->
		{#if isLoadingSuggestions && outcomes.length === 0}
			<div class="space-y-2">
				{#each [1, 2, 3] as _}
					<div class="h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 animate-pulse"></div>
				{/each}
			</div>
		{/if}

		<!-- Outcome cards -->
		{#if outcomes.length > 0}
			<div class="space-y-2">
				{#each outcomes as outcome (outcome.id)}
					<div
						class="flex items-start gap-3 p-3 rounded-lg
						       border transition-all duration-150
						       {outcome.selected
						         ? 'bg-primary-500/5 border-primary-500/20 dark:bg-primary-500/10'
						         : 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-700/50 opacity-60'}"
					>
						<input
							type="checkbox"
							checked={outcome.selected}
							onchange={() => handleToggleOutcome(outcome.id)}
							class="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-600
							       text-primary-600 focus:ring-primary-500 accent-primary-500"
						/>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
									{outcome.label}
								</span>
								<span class="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded border {typeColors[outcome.type]}">
									{typeLabels[outcome.type]}
								</span>
							</div>
							{#if outcome.aiReason}
								<p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
									{outcome.aiReason}
								</p>
							{/if}
						</div>
						<button
							type="button"
							onclick={() => handleRemoveOutcome(outcome.id)}
							class="p-1 rounded text-zinc-400 hover:text-red-500 dark:hover:text-red-400
							       hover:bg-red-500/10 transition-all duration-150"
							title="Remove outcome"
						>
							<X class="w-3.5 h-3.5" />
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Add custom outcome -->
		{#if showCustomInput}
			<div class="flex items-center gap-2 p-3 rounded-lg
			            bg-zinc-50 dark:bg-zinc-800/30
			            border border-zinc-200 dark:border-zinc-700/50">
				<input
					type="text"
					bind:value={customLabel}
					onkeydown={handleCustomKeydown}
					placeholder="Outcome description..."
					class="flex-1 px-3 py-1.5 text-sm rounded-md
					       bg-white dark:bg-zinc-800
					       border border-zinc-200 dark:border-zinc-600
					       text-zinc-900 dark:text-zinc-100
					       placeholder:text-zinc-400
					       focus:outline-none focus:ring-1 focus:ring-primary-500
					       transition-all duration-150"
				/>
				<select
					bind:value={customType}
					class="px-2 py-1.5 text-xs rounded-md
					       bg-white dark:bg-zinc-800
					       border border-zinc-200 dark:border-zinc-600
					       text-zinc-700 dark:text-zinc-300
					       focus:outline-none focus:ring-1 focus:ring-primary-500"
				>
					<option value="decision">Decision</option>
					<option value="action_item">Action Item</option>
					<option value="information">Information</option>
					<option value="custom">Custom</option>
				</select>
				<button
					type="button"
					onclick={handleAddCustom}
					disabled={!customLabel.trim()}
					class="px-3 py-1.5 text-xs font-medium rounded-md
					       bg-primary-500 text-white
					       hover:bg-primary-600
					       disabled:opacity-40 disabled:cursor-not-allowed
					       transition-all duration-150"
				>
					Add
				</button>
				<button
					type="button"
					onclick={() => { showCustomInput = false; customLabel = ''; }}
					class="p-1.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300
					       transition-colors duration-150"
				>
					<X class="w-3.5 h-3.5" />
				</button>
			</div>
		{:else}
			<button
				type="button"
				onclick={() => (showCustomInput = true)}
				class="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm
				       text-zinc-500 dark:text-zinc-400
				       border border-dashed border-zinc-300 dark:border-zinc-600
				       hover:border-zinc-400 dark:hover:border-zinc-500
				       hover:text-zinc-600 dark:hover:text-zinc-300
				       hover:bg-zinc-50 dark:hover:bg-zinc-800/30
				       transition-all duration-150"
			>
				<Plus class="w-4 h-4" />
				Add custom outcome
			</button>
		{/if}
	</div>
</div>
