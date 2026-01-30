<script lang="ts">
	/**
	 * CaptureActionsStep — Step 3 of the capture wizard
	 *
	 * Users can add action items with assignee, due date, and
	 * "create as subtask" toggle. Items can be added freely beyond
	 * the expected outcomes.
	 */
	import { Plus, X, ChevronDown, ListTodo } from 'lucide-svelte';
	import type { CaptureActionItem } from '$lib/types/meeting-capture';
	import type { MeetingAttendee } from '$lib/types/meetings';

	interface Props {
		actionItems: CaptureActionItem[];
		attendees: MeetingAttendee[];
		hasParentTask: boolean;
		onActionItemsChange: (items: CaptureActionItem[]) => void;
	}

	let { actionItems, attendees, hasParentTask, onActionItemsChange }: Props = $props();

	function generateId(): string {
		return `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
	}

	function addActionItem() {
		onActionItemsChange([
			...actionItems,
			{
				id: generateId(),
				text: '',
				assigneeId: undefined,
				assigneeName: undefined,
				dueDate: undefined,
				createSubtask: hasParentTask,
				confirmed: true
			}
		]);
	}

	function removeActionItem(id: string) {
		onActionItemsChange(actionItems.filter(a => a.id !== id));
	}

	function updateItem(id: string, field: keyof CaptureActionItem, value: unknown) {
		onActionItemsChange(
			actionItems.map(a => {
				if (a.id !== id) return a;
				const updated = { ...a, [field]: value };
				// Sync assigneeName when assigneeId changes
				if (field === 'assigneeId') {
					const attendee = attendees.find(att => (att.userId || att.id) === value);
					updated.assigneeName = attendee?.displayName || attendee?.email;
				}
				return updated;
			})
		);
	}

	// Format today's date for min attribute
	const today = new Date().toISOString().split('T')[0];
</script>

<div class="space-y-5">
	<!-- Intro text -->
	<div>
		<h3 class="text-base font-medium text-zinc-900 dark:text-zinc-100">
			Action items
		</h3>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Capture tasks that came out of this meeting. {hasParentTask ? 'Items with "Create subtask" will be added to the meeting task.' : ''}
		</p>
	</div>

	<!-- Action item cards -->
	{#if actionItems.length > 0}
		<div class="space-y-4">
			{#each actionItems as item, index (item.id)}
				<div class="rounded-lg border border-zinc-200 dark:border-zinc-700
				            bg-white dark:bg-zinc-800/50 p-4 space-y-3">
					<!-- Header with remove button -->
					<div class="flex items-start justify-between gap-2">
						<span class="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
							Action {index + 1}
						</span>
						<button
							type="button"
							onclick={() => removeActionItem(item.id)}
							class="p-1 rounded text-zinc-400 hover:text-red-500
							       hover:bg-red-500/10 transition-all duration-150"
							aria-label="Remove action item"
						>
							<X class="w-4 h-4" />
						</button>
					</div>

					<!-- Action text -->
					<input
						type="text"
						value={item.text}
						oninput={(e) => updateItem(item.id, 'text', e.currentTarget.value)}
						placeholder="What needs to be done?"
						class="w-full px-3 py-2 text-sm rounded-lg
						       bg-zinc-50 dark:bg-zinc-800
						       border border-zinc-200 dark:border-zinc-600
						       text-zinc-900 dark:text-zinc-100
						       placeholder:text-zinc-400 dark:placeholder:text-zinc-500
						       focus:outline-none focus:ring-2 focus:ring-primary-500/30"
					/>

					<!-- Assignee + Due date + Create subtask row -->
					<div class="flex items-center gap-4 flex-wrap">
						<!-- Assignee dropdown -->
						<div class="flex items-center gap-2">
							<label for="action-assignee-{item.id}" class="text-xs text-zinc-500 dark:text-zinc-400">
								Assignee:
							</label>
							<div class="relative">
								<select
									id="action-assignee-{item.id}"
									value={item.assigneeId || ''}
									onchange={(e) => updateItem(item.id, 'assigneeId', e.currentTarget.value || undefined)}
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

						<!-- Due date -->
						<div class="flex items-center gap-2">
							<label for="action-due-{item.id}" class="text-xs text-zinc-500 dark:text-zinc-400">
								Due:
							</label>
							<input
								id="action-due-{item.id}"
								type="date"
								value={item.dueDate || ''}
								min={today}
								onchange={(e) => updateItem(item.id, 'dueDate', e.currentTarget.value || undefined)}
								class="px-2 py-1 text-sm rounded-lg
								       bg-zinc-50 dark:bg-zinc-800
								       border border-zinc-200 dark:border-zinc-600
								       text-zinc-900 dark:text-zinc-100
								       focus:outline-none focus:ring-2 focus:ring-primary-500/30"
							/>
						</div>

						<!-- Create subtask toggle -->
						{#if hasParentTask}
							<label class="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={item.createSubtask}
									onchange={(e) => updateItem(item.id, 'createSubtask', e.currentTarget.checked)}
									class="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600
									       text-primary-500 focus:ring-primary-500/30"
								/>
								<span class="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
									<ListTodo class="w-3.5 h-3.5" />
									Create subtask
								</span>
							</label>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-6 text-sm text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg">
			No action items yet.
		</div>
	{/if}

	<!-- Add action item button -->
	<button
		type="button"
		onclick={addActionItem}
		class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
		       text-primary-600 dark:text-primary-400
		       hover:bg-primary-500/10
		       transition-all duration-150"
	>
		<Plus class="w-4 h-4" />
		Add Action Item
	</button>
</div>
