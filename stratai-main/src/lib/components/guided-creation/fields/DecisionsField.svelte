<script lang="ts">
	/**
	 * Decisions Field Component
	 *
	 * Decisions with owner selection and optional rationale.
	 */

	import type { FieldDefinition } from '$lib/types/guided-creation';
	import type { MeetingDecision } from '$lib/types/meeting-notes-data';
	import { createMeetingDecision } from '$lib/types/meeting-notes-data';
	import { Plus, X, ChevronDown, ChevronUp } from 'lucide-svelte';

	interface Props {
		field: FieldDefinition;
		value: MeetingDecision[];
		onUpdate: (value: MeetingDecision[]) => void;
		disabled?: boolean;
	}

	let { field, value = [], onUpdate, disabled = false }: Props = $props();

	// Track which decisions have expanded rationale
	let expandedRationale = $state<Set<string>>(new Set());

	// TODO: In Phase 6, get from Space/Area members
	const availableOwners = [
		{ id: 'user-1', name: 'John Doe' },
		{ id: 'user-2', name: 'Jane Smith' },
		{ id: 'user-3', name: 'Bob Wilson' }
	];

	function addDecision() {
		const newDecision = createMeetingDecision('');
		onUpdate([...value, newDecision]);
	}

	function removeDecision(id: string) {
		onUpdate(value.filter((d) => d.id !== id));
		expandedRationale.delete(id);
		expandedRationale = expandedRationale;
	}

	function updateDecision(id: string, updates: Partial<MeetingDecision>) {
		onUpdate(value.map((d) => (d.id === id ? { ...d, ...updates } : d)));
	}

	function toggleRationale(id: string) {
		if (expandedRationale.has(id)) {
			expandedRationale.delete(id);
		} else {
			expandedRationale.add(id);
		}
		expandedRationale = expandedRationale;
	}
</script>

<div class="field">
	<label class="field-label">
		{field.label}
		{#if !field.required}
			<span class="field-hint">(optional)</span>
		{/if}
	</label>

	{#if value.length > 0}
		<div class="decisions-list">
			{#each value as decision (decision.id)}
				<div class="decision-item">
					<div class="decision-main">
						<input
							type="text"
							class="decision-input"
							placeholder="What was decided?"
							value={decision.text}
							oninput={(e) =>
								updateDecision(decision.id, { text: (e.target as HTMLInputElement).value })}
							{disabled}
						/>
						<select
							class="owner-select"
							value={decision.ownerId || ''}
							onchange={(e) =>
								updateDecision(decision.id, {
									ownerId: (e.target as HTMLSelectElement).value || undefined
								})}
							{disabled}
						>
							<option value="">No owner</option>
							{#each availableOwners as owner (owner.id)}
								<option value={owner.id}>{owner.name}</option>
							{/each}
						</select>
						<button
							type="button"
							class="item-remove"
							onclick={() => removeDecision(decision.id)}
							{disabled}
						>
							<X class="w-4 h-4" />
						</button>
					</div>

					<button
						type="button"
						class="rationale-toggle"
						onclick={() => toggleRationale(decision.id)}
						{disabled}
					>
						{#if expandedRationale.has(decision.id)}
							<ChevronUp class="w-3.5 h-3.5" />
						{:else}
							<ChevronDown class="w-3.5 h-3.5" />
						{/if}
						{decision.rationale ? 'Edit rationale' : 'Add rationale'}
					</button>

					{#if expandedRationale.has(decision.id)}
						<textarea
							class="rationale-input"
							placeholder="Why was this decision made?"
							value={decision.rationale || ''}
							oninput={(e) =>
								updateDecision(decision.id, {
									rationale: (e.target as HTMLTextAreaElement).value || undefined
								})}
							{disabled}
							rows="2"
						></textarea>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<button type="button" class="add-btn" onclick={addDecision} {disabled}>
		<Plus class="w-4 h-4" />
		Add decision
	</button>

	{#if field.hint}
		<p class="field-helper">{field.hint}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.field-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #f4f4f5;
	}

	.field-hint {
		font-weight: 400;
		color: #71717a;
	}

	.decisions-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.decision-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid #27272a;
		border-radius: 0.5rem;
	}

	.decision-main {
		display: flex;
		gap: 0.5rem;
	}

	.decision-input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3f3f46;
		border-radius: 0.375rem;
		color: #f4f4f5;
		font-size: 0.875rem;
		transition: all 0.15s ease;
	}

	.decision-input:focus {
		outline: none;
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
	}

	.decision-input::placeholder {
		color: #71717a;
	}

	.owner-select {
		width: 140px;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3f3f46;
		border-radius: 0.375rem;
		color: #f4f4f5;
		font-size: 0.875rem;
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff50'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
		background-size: 1rem;
		padding-right: 2rem;
	}

	.owner-select:focus {
		outline: none;
		border-color: #6366f1;
	}

	.item-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: none;
		border: none;
		color: #71717a;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.item-remove:hover:not(:disabled) {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	.rationale-toggle {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0;
		background: none;
		border: none;
		color: #71717a;
		font-size: 0.75rem;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.rationale-toggle:hover:not(:disabled) {
		color: #a1a1aa;
	}

	.rationale-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3f3f46;
		border-radius: 0.375rem;
		color: #f4f4f5;
		font-size: 0.8125rem;
		font-family: inherit;
		resize: vertical;
		min-height: 3rem;
		transition: all 0.15s ease;
	}

	.rationale-input:focus {
		outline: none;
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
	}

	.rationale-input::placeholder {
		color: #71717a;
	}

	.add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem;
		background: none;
		border: 1px dashed #3f3f46;
		border-radius: 0.5rem;
		color: #71717a;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.add-btn:hover:not(:disabled) {
		border-color: #6366f1;
		color: #6366f1;
	}

	.add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.field-helper {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
	}
</style>
