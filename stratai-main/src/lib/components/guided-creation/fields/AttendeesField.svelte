<script lang="ts">
	/**
	 * Attendees Field Component
	 *
	 * Internal users + external attendees compound field.
	 */

	import type { FieldDefinition } from '$lib/types/guided-creation';
	import type { MeetingAttendees, ExternalAttendee } from '$lib/types/meeting-notes-data';
	import { Plus, X, User, Building } from 'lucide-svelte';

	interface Props {
		field: FieldDefinition;
		value: MeetingAttendees;
		onUpdate: (value: MeetingAttendees) => void;
		disabled?: boolean;
	}

	let {
		field,
		value = { internal: [], external: [] },
		onUpdate,
		disabled = false
	}: Props = $props();

	// External attendee form state
	let showExternalForm = $state(false);
	let externalName = $state('');
	let externalOrg = $state('');
	let externalEmail = $state('');

	// TODO: In Phase 6, load real users from Space/Area members
	const availableUsers = [
		{ id: 'user-1', name: 'John Doe' },
		{ id: 'user-2', name: 'Jane Smith' },
		{ id: 'user-3', name: 'Bob Wilson' }
	];

	function toggleInternalUser(userId: string) {
		const current = value.internal;
		const newInternal = current.includes(userId)
			? current.filter((id) => id !== userId)
			: [...current, userId];
		onUpdate({ ...value, internal: newInternal });
	}

	function addExternalAttendee() {
		const trimmedName = externalName.trim();
		if (!trimmedName) return;

		const newExternal: ExternalAttendee = {
			name: trimmedName,
			organization: externalOrg.trim() || undefined,
			email: externalEmail.trim() || undefined
		};

		onUpdate({
			...value,
			external: [...value.external, newExternal]
		});

		// Reset form
		externalName = '';
		externalOrg = '';
		externalEmail = '';
		showExternalForm = false;
	}

	function removeExternalAttendee(index: number) {
		onUpdate({
			...value,
			external: value.external.filter((_, i) => i !== index)
		});
	}
</script>

<div class="field">
	<label class="field-label">
		{field.label}
		{#if !field.required}
			<span class="field-hint">(optional)</span>
		{/if}
	</label>

	<!-- Internal Users Section -->
	<div class="section">
		<span class="section-label">
			<User class="w-4 h-4" />
			Team Members
		</span>
		<div class="user-checkboxes">
			{#each availableUsers as user (user.id)}
				<label class="user-checkbox">
					<input
						type="checkbox"
						checked={value.internal.includes(user.id)}
						onchange={() => toggleInternalUser(user.id)}
						{disabled}
					/>
					<span>{user.name}</span>
				</label>
			{/each}
		</div>
	</div>

	<!-- External Attendees Section -->
	<div class="section">
		<span class="section-label">
			<Building class="w-4 h-4" />
			External Attendees
		</span>

		{#if value.external.length > 0}
			<div class="external-list">
				{#each value.external as attendee, index (index)}
					<div class="external-item">
						<div class="external-info">
							<span class="external-name">{attendee.name}</span>
							{#if attendee.organization}
								<span class="external-org">{attendee.organization}</span>
							{/if}
						</div>
						<button
							type="button"
							class="item-remove"
							onclick={() => removeExternalAttendee(index)}
							{disabled}
						>
							<X class="w-3.5 h-3.5" />
						</button>
					</div>
				{/each}
			</div>
		{/if}

		{#if showExternalForm}
			<div class="external-form">
				<input
					type="text"
					class="field-input"
					placeholder="Name *"
					bind:value={externalName}
					{disabled}
				/>
				<input
					type="text"
					class="field-input"
					placeholder="Organization"
					bind:value={externalOrg}
					{disabled}
				/>
				<input
					type="email"
					class="field-input"
					placeholder="Email"
					bind:value={externalEmail}
					{disabled}
				/>
				<div class="form-actions">
					<button
						type="button"
						class="btn-secondary"
						onclick={() => (showExternalForm = false)}
						{disabled}
					>
						Cancel
					</button>
					<button
						type="button"
						class="btn-primary"
						onclick={addExternalAttendee}
						disabled={disabled || !externalName.trim()}
					>
						Add
					</button>
				</div>
			</div>
		{:else}
			<button
				type="button"
				class="add-external-btn"
				onclick={() => (showExternalForm = true)}
				{disabled}
			>
				<Plus class="w-4 h-4" />
				Add external attendee
			</button>
		{/if}
	</div>

	{#if field.hint}
		<p class="field-helper">{field.hint}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 1rem;
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

	.section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid #27272a;
		border-radius: 0.5rem;
	}

	.section-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #a1a1aa;
	}

	.user-checkboxes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.user-checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3f3f46;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.user-checkbox:hover {
		border-color: #6366f1;
	}

	.user-checkbox:has(input:checked) {
		background: rgba(99, 102, 241, 0.15);
		border-color: #6366f1;
	}

	.user-checkbox input {
		accent-color: #6366f1;
	}

	.user-checkbox span {
		font-size: 0.875rem;
		color: #e4e4e7;
	}

	.external-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.external-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3f3f46;
		border-radius: 0.375rem;
	}

	.external-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.external-name {
		font-size: 0.875rem;
		color: #e4e4e7;
	}

	.external-org {
		font-size: 0.75rem;
		color: #71717a;
	}

	.item-remove {
		display: flex;
		align-items: center;
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

	.external-form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-input {
		width: 100%;
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

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.btn-secondary {
		padding: 0.375rem 0.75rem;
		background: none;
		border: 1px solid #3f3f46;
		border-radius: 0.375rem;
		color: #e4e4e7;
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #27272a;
	}

	.btn-primary {
		padding: 0.375rem 0.75rem;
		background: #6366f1;
		border: none;
		border-radius: 0.375rem;
		color: white;
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-primary:hover:not(:disabled) {
		background: #4f46e5;
	}

	.btn-primary:disabled,
	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.add-external-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: none;
		border: 1px dashed #3f3f46;
		border-radius: 0.375rem;
		color: #71717a;
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.add-external-btn:hover:not(:disabled) {
		border-color: #6366f1;
		color: #6366f1;
	}

	.add-external-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.field-helper {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
	}
</style>
