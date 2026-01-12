<script lang="ts">
	/**
	 * Action Items Field Component
	 *
	 * Action items with assignee, due date, and "create as task" toggle.
	 */

	import type { FieldDefinition } from '$lib/types/guided-creation';
	import type { MeetingActionItem } from '$lib/types/meeting-notes-data';
	import { createMeetingActionItem } from '$lib/types/meeting-notes-data';
	import { Plus, X, CheckSquare } from 'lucide-svelte';

	/** User info from the system */
	interface UserInfo {
		id: string;
		name: string;
		email?: string;
	}

	interface Props {
		field: FieldDefinition;
		value: MeetingActionItem[];
		onUpdate: (value: MeetingActionItem[]) => void;
		disabled?: boolean;
		users?: UserInfo[];
	}

	let { field, value = [], onUpdate, disabled = false, users = [] }: Props = $props();

	// Use provided users for assignee selection
	let availableAssignees = $derived(users);

	function addActionItem() {
		const newItem = createMeetingActionItem('', true);
		onUpdate([...value, newItem]);
	}

	function removeActionItem(id: string) {
		onUpdate(value.filter((item) => item.id !== id));
	}

	function updateActionItem(id: string, updates: Partial<MeetingActionItem>) {
		onUpdate(value.map((item) => (item.id === id ? { ...item, ...updates } : item)));
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
		<div class="action-items-list">
			{#each value as item (item.id)}
				<div class="action-item">
					<div class="item-row">
						<input
							type="text"
							class="action-input"
							placeholder="What needs to be done?"
							value={item.text}
							oninput={(e) =>
								updateActionItem(item.id, { text: (e.target as HTMLInputElement).value })}
							{disabled}
						/>
						<button
							type="button"
							class="item-remove"
							onclick={() => removeActionItem(item.id)}
							{disabled}
						>
							<X class="w-4 h-4" />
						</button>
					</div>

					<div class="item-details">
						<select
							class="assignee-select"
							value={item.assigneeId || ''}
							onchange={(e) =>
								updateActionItem(item.id, {
									assigneeId: (e.target as HTMLSelectElement).value || undefined
								})}
							{disabled}
						>
							<option value="">Unassigned</option>
							{#each availableAssignees as assignee (assignee.id)}
								<option value={assignee.id}>{assignee.name}</option>
							{/each}
						</select>

						<input
							type="date"
							class="due-date-input"
							value={item.dueDate || ''}
							onchange={(e) =>
								updateActionItem(item.id, {
									dueDate: (e.target as HTMLInputElement).value || undefined
								})}
							{disabled}
						/>

						<label class="create-task-toggle">
							<input
								type="checkbox"
								checked={item.createTask}
								onchange={(e) =>
									updateActionItem(item.id, {
										createTask: (e.target as HTMLInputElement).checked
									})}
								{disabled}
							/>
							<CheckSquare class="w-4 h-4" />
							<span>Create Task</span>
						</label>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<button type="button" class="add-btn" onclick={addActionItem} {disabled}>
		<Plus class="w-4 h-4" />
		Add action item
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

	.action-items-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.action-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid #27272a;
		border-radius: 0.5rem;
	}

	.item-row {
		display: flex;
		gap: 0.5rem;
	}

	.action-input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3f3f46;
		border-radius: 0.375rem;
		color: #f4f4f5;
		font-size: 0.875rem;
		transition: all 0.15s ease;
	}

	.action-input:focus {
		outline: none;
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
	}

	.action-input::placeholder {
		color: #71717a;
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

	.item-details {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.assignee-select,
	.due-date-input {
		padding: 0.375rem 0.625rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3f3f46;
		border-radius: 0.375rem;
		color: #f4f4f5;
		font-size: 0.8125rem;
		transition: all 0.15s ease;
	}

	.assignee-select {
		min-width: 120px;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff50'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
		background-size: 0.875rem;
		padding-right: 1.75rem;
		cursor: pointer;
	}

	.due-date-input {
		width: 130px;
		color-scheme: dark;
	}

	.due-date-input::-webkit-calendar-picker-indicator {
		filter: invert(0.7);
		cursor: pointer;
	}

	.assignee-select:focus,
	.due-date-input:focus {
		outline: none;
		border-color: #6366f1;
	}

	.create-task-toggle {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		background: rgba(99, 102, 241, 0.1);
		border: 1px solid rgba(99, 102, 241, 0.3);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.create-task-toggle:hover {
		background: rgba(99, 102, 241, 0.15);
	}

	.create-task-toggle:has(input:checked) {
		background: rgba(99, 102, 241, 0.2);
		border-color: #6366f1;
	}

	.create-task-toggle input {
		display: none;
	}

	.create-task-toggle span {
		font-size: 0.75rem;
		color: #a5b4fc;
	}

	.create-task-toggle :global(svg) {
		color: #6366f1;
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
