<script lang="ts">
	/**
	 * DateTime Field Component
	 *
	 * Date/time picker using native HTML inputs.
	 */

	import type { FieldDefinition } from '$lib/types/guided-creation';

	interface Props {
		field: FieldDefinition;
		value: string; // ISO datetime string
		onUpdate: (value: string) => void;
		disabled?: boolean;
	}

	let { field, value = '', onUpdate, disabled = false }: Props = $props();

	// Split ISO datetime into date and time parts
	let dateValue = $derived(value ? value.split('T')[0] : '');
	let timeValue = $derived(value ? value.split('T')[1]?.substring(0, 5) : '');

	function handleDateChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const newDate = input.value;
		const time = timeValue || '09:00';
		if (newDate) {
			onUpdate(`${newDate}T${time}:00`);
		}
	}

	function handleTimeChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const newTime = input.value;
		const date = dateValue || new Date().toISOString().split('T')[0];
		if (newTime) {
			onUpdate(`${date}T${newTime}:00`);
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
	<div class="datetime-inputs">
		<input
			id={field.id}
			type="date"
			class="field-input date-input"
			value={dateValue}
			onchange={handleDateChange}
			{disabled}
		/>
		<input
			type="time"
			class="field-input time-input"
			value={timeValue}
			onchange={handleTimeChange}
			{disabled}
		/>
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

	.datetime-inputs {
		display: flex;
		gap: 0.5rem;
	}

	.field-input {
		padding: 0.625rem 0.875rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		color: #f4f4f5;
		font-size: 0.9375rem;
		transition: all 0.15s ease;
		color-scheme: dark;
	}

	.date-input {
		flex: 1;
	}

	.time-input {
		width: 120px;
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

	.field-helper {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
	}

	/* Style native date/time pickers for dark mode */
	input[type='date']::-webkit-calendar-picker-indicator,
	input[type='time']::-webkit-calendar-picker-indicator {
		filter: invert(0.7);
		cursor: pointer;
	}
</style>
