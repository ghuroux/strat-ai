<script lang="ts">
	/**
	 * List Field Component
	 *
	 * Add/remove repeatable text items.
	 */

	import type { FieldDefinition } from '$lib/types/guided-creation';
	import { Plus, X } from 'lucide-svelte';

	interface Props {
		field: FieldDefinition;
		value: string[];
		onUpdate: (value: string[]) => void;
		disabled?: boolean;
	}

	let { field, value = [], onUpdate, disabled = false }: Props = $props();

	let newItem = $state('');

	function addItem() {
		const trimmed = newItem.trim();
		if (trimmed && !value.includes(trimmed)) {
			onUpdate([...value, trimmed]);
			newItem = '';
		}
	}

	function removeItem(index: number) {
		onUpdate(value.filter((_, i) => i !== index));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addItem();
		}
	}
</script>

<div class="field">
	<label for={field.id} class="field-label">
		{field.label}
		{#if !field.required}
			<span class="field-hint">(optional)</span>
		{/if}
	</label>

	<!-- Existing items -->
	{#if value.length > 0}
		<div class="list-items">
			{#each value as item, index (item)}
				<div class="list-item">
					<span class="item-text">{item}</span>
					<button
						type="button"
						class="item-remove"
						onclick={() => removeItem(index)}
						{disabled}
						aria-label="Remove item"
					>
						<X class="w-3.5 h-3.5" />
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Add new item -->
	<div class="add-item">
		<input
			id={field.id}
			type="text"
			class="field-input"
			placeholder={field.placeholder || 'Add item...'}
			bind:value={newItem}
			onkeydown={handleKeydown}
			{disabled}
		/>
		<button
			type="button"
			class="add-button"
			onclick={addItem}
			disabled={disabled || !newItem.trim()}
			aria-label="Add item"
		>
			<Plus class="w-4 h-4" />
		</button>
	</div>

	{#if field.hint}
		<p class="field-helper">{field.hint}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
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

	.list-items {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.list-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3f3f46;
		border-radius: 0.375rem;
	}

	.item-text {
		font-size: 0.875rem;
		color: #e4e4e7;
	}

	.item-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		background: none;
		border: none;
		color: #71717a;
		cursor: pointer;
		border-radius: 0.25rem;
		transition: all 0.15s ease;
	}

	.item-remove:hover:not(:disabled) {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	.item-remove:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.add-item {
		display: flex;
		gap: 0.5rem;
	}

	.field-input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		color: #f4f4f5;
		font-size: 0.875rem;
		transition: all 0.15s ease;
	}

	.field-input:focus {
		outline: none;
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
	}

	.field-input::placeholder {
		color: #71717a;
	}

	.add-button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: #6366f1;
		border: none;
		border-radius: 0.5rem;
		color: white;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.add-button:hover:not(:disabled) {
		background: #4f46e5;
	}

	.add-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.field-helper {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
	}
</style>
