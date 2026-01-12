<script lang="ts">
	/**
	 * Toggle Field Component
	 *
	 * Boolean toggle switch with label.
	 */

	import type { FieldDefinition } from '$lib/types/guided-creation';

	interface Props {
		field: FieldDefinition;
		value: boolean;
		onUpdate: (value: boolean) => void;
		disabled?: boolean;
	}

	let { field, value = false, onUpdate, disabled = false }: Props = $props();

	function handleToggle() {
		if (!disabled) {
			onUpdate(!value);
		}
	}
</script>

<div class="field">
	<button
		type="button"
		class="toggle-field"
		class:active={value}
		onclick={handleToggle}
		{disabled}
		role="switch"
		aria-checked={value}
	>
		<div class="toggle-track">
			<div class="toggle-thumb"></div>
		</div>
		<span class="toggle-label">{field.label}</span>
	</button>
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

	.toggle-field {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	.toggle-field:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-track {
		position: relative;
		width: 44px;
		height: 24px;
		background: #3f3f46;
		border-radius: 12px;
		transition: background 0.2s ease;
	}

	.toggle-field.active .toggle-track {
		background: #6366f1;
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 20px;
		height: 20px;
		background: white;
		border-radius: 50%;
		transition: transform 0.2s ease;
	}

	.toggle-field.active .toggle-thumb {
		transform: translateX(20px);
	}

	.toggle-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #f4f4f5;
	}

	.field-helper {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
		margin-left: 56px; /* Align with label */
	}
</style>
