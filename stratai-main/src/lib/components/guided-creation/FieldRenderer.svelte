<script lang="ts">
	/**
	 * Field Renderer Component
	 *
	 * Maps field types to their respective components.
	 * Acts as a switch to render the appropriate field based on type.
	 */

	import type { FieldDefinition } from '$lib/types/guided-creation';
	import type { MeetingAttendees, MeetingDecision, MeetingActionItem } from '$lib/types/meeting-notes-data';
	import TextField from './fields/TextField.svelte';
	import TextAreaField from './fields/TextAreaField.svelte';
	import DateTimeField from './fields/DateTimeField.svelte';
	import ToggleField from './fields/ToggleField.svelte';
	import ListField from './fields/ListField.svelte';
	import AttendeesField from './fields/AttendeesField.svelte';
	import DecisionsField from './fields/DecisionsField.svelte';
	import ActionItemsField from './fields/ActionItemsField.svelte';

	interface Props {
		field: FieldDefinition;
		value: unknown;
		onUpdate: (value: unknown) => void;
		disabled?: boolean;
	}

	let { field, value, onUpdate, disabled = false }: Props = $props();
</script>

{#if field.type === 'text'}
	<TextField {field} value={value as string} {onUpdate} {disabled} />
{:else if field.type === 'textarea'}
	<TextAreaField {field} value={value as string} {onUpdate} {disabled} />
{:else if field.type === 'datetime' || field.type === 'date'}
	<DateTimeField {field} value={value as string} {onUpdate} {disabled} />
{:else if field.type === 'toggle'}
	<ToggleField {field} value={value as boolean} {onUpdate} {disabled} />
{:else if field.type === 'list'}
	<ListField {field} value={value as string[]} {onUpdate} {disabled} />
{:else if field.type === 'attendees'}
	<AttendeesField {field} value={value as MeetingAttendees} {onUpdate} {disabled} />
{:else if field.type === 'decisions'}
	<DecisionsField {field} value={value as MeetingDecision[]} {onUpdate} {disabled} />
{:else if field.type === 'action-items'}
	<ActionItemsField {field} value={value as MeetingActionItem[]} {onUpdate} {disabled} />
{:else}
	<!-- Fallback for unsupported field types -->
	<div class="unsupported-field">
		<span>Unsupported field type: {field.type}</span>
	</div>
{/if}

<style>
	.unsupported-field {
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 0.5rem;
		color: #fca5a5;
		font-size: 0.875rem;
	}
</style>
