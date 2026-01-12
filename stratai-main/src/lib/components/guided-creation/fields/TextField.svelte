<script lang="ts">
	/**
	 * Text Field Component
	 *
	 * Simple text input with label, placeholder, required indicator.
	 */

	import type { FieldDefinition } from '$lib/types/guided-creation';

	interface Props {
		field: FieldDefinition;
		value: string;
		onUpdate: (value: string) => void;
		disabled?: boolean;
	}

	let { field, value = '', onUpdate, disabled = false }: Props = $props();

	function handleInput(e: Event) {
		const input = e.target as HTMLInputElement;
		onUpdate(input.value);
	}
</script>

<div class="field">
	<label for={field.id} class="field-label">
		{field.label}
		{#if !field.required}
			<span class="field-hint">(optional)</span>
		{/if}
	</label>
	<input
		id={field.id}
		type="text"
		class="field-input"
		placeholder={field.placeholder || ''}
		{value}
		oninput={handleInput}
		{disabled}
	/>
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

	.field-input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		color: #f4f4f5;
		font-size: 0.9375rem;
		transition: all 0.15s ease;
	}

	.field-input:focus {
		outline: none;
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
	}

	.field-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.field-input::placeholder {
		color: #71717a;
	}

	.field-helper {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
	}
</style>
