<script lang="ts">
	/**
	 * Complete Task Modal
	 *
	 * Shown when completing a task that has incomplete subtasks.
	 * Offers options to complete all subtasks, just the task, or cancel.
	 */
	import type { Task } from '$lib/types/tasks';

	interface Props {
		task: Task;
		incompleteSubtasks: Task[];
		onCompleteAll: () => void;
		onCompleteTaskOnly: () => void;
		onCancel: () => void;
	}

	let { task, incompleteSubtasks, onCompleteAll, onCompleteTaskOnly, onCancel }: Props = $props();

	let isCompleting = $state(false);
	let completingAction = $state<'all' | 'task' | null>(null);

	function handleCompleteAll() {
		isCompleting = true;
		completingAction = 'all';
		onCompleteAll();
	}

	function handleCompleteTaskOnly() {
		isCompleting = true;
		completingAction = 'task';
		onCompleteTaskOnly();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isCompleting) {
			onCancel();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Backdrop -->
<div
	class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
	onclick={() => !isCompleting && onCancel()}
	role="dialog"
	aria-modal="true"
	aria-labelledby="complete-modal-title"
>
	<!-- Modal -->
	<div
		class="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full p-6"
		onclick={(e) => e.stopPropagation()}
		role="document"
	>
		<!-- Header -->
		<div class="flex items-start gap-3 mb-4">
			<div
				class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20"
			>
				<svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
			</div>
			<div>
				<h2 id="complete-modal-title" class="text-lg font-semibold text-white">
					Complete Task?
				</h2>
				<p class="text-sm text-zinc-400 mt-1">
					<strong class="text-amber-400">{incompleteSubtasks.length} subtask{incompleteSubtasks.length === 1 ? '' : 's'}</strong> still incomplete.
					They will be marked as completed.
				</p>
			</div>
		</div>

		<!-- Incomplete Subtasks List -->
		<div class="mb-6">
			<p class="text-xs text-zinc-500 uppercase tracking-wider mb-2">Remaining subtasks:</p>
			<div class="space-y-1 max-h-40 overflow-y-auto">
				{#each incompleteSubtasks as subtask (subtask.id)}
					<div class="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-zinc-800/50">
						{#if subtask.subtaskType === 'action'}
							<div
								class="w-4 h-4 rounded border border-zinc-600 flex items-center justify-center flex-shrink-0"
							></div>
						{:else}
							<svg
								class="w-4 h-4 text-zinc-500 flex-shrink-0"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
								/>
							</svg>
						{/if}
						<span class="text-sm text-zinc-300 truncate">{subtask.title}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Actions -->
		<div class="space-y-2">
			<!-- Complete All -->
			<button
				type="button"
				onclick={handleCompleteAll}
				disabled={isCompleting}
				class="w-full px-4 py-3 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				{#if isCompleting && completingAction === 'all'}
					<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Completing...
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
					Complete All
				{/if}
			</button>

			<!-- Complete Task Only -->
			<button
				type="button"
				onclick={handleCompleteTaskOnly}
				disabled={isCompleting}
				class="w-full px-4 py-2.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-zinc-700"
			>
				{#if isCompleting && completingAction === 'task'}
					<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Completing...
				{:else}
					Complete task only
				{/if}
			</button>

			<!-- Cancel -->
			<button
				type="button"
				onclick={onCancel}
				disabled={isCompleting}
				class="w-full px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
			>
				Cancel
			</button>
		</div>
	</div>
</div>
