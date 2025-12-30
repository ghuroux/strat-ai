<script lang="ts">
	import type { Task } from '$lib/types/tasks';

	interface Props {
		task: Task;
		subtaskCount: number;
		conversationCount: number;
		onConfirm: (deleteConversations: boolean) => void;
		onCancel: () => void;
	}

	let { task, subtaskCount, conversationCount, onConfirm, onCancel }: Props = $props();

	let deleteConversations = $state(false);
	let isDeleting = $state(false);

	function handleConfirm() {
		isDeleting = true;
		onConfirm(deleteConversations);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Backdrop -->
<div
	class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
	onclick={onCancel}
	role="dialog"
	aria-modal="true"
	aria-labelledby="delete-modal-title"
>
	<!-- Modal -->
	<div
		class="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full p-6"
		onclick={(e) => e.stopPropagation()}
		role="document"
	>
		<!-- Header -->
		<h2 id="delete-modal-title" class="text-lg font-semibold text-white mb-4">
			Delete "{task.title}"?
		</h2>

		<!-- Content -->
		<div class="space-y-4 text-sm text-zinc-300">
			{#if subtaskCount > 0}
				<p class="flex items-center gap-2">
					<svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					<span>
						This will also delete <strong class="text-white">{subtaskCount}</strong> subtask{subtaskCount === 1 ? '' : 's'}.
					</span>
				</p>
			{/if}

			{#if conversationCount > 0}
				<label class="flex items-start gap-3 cursor-pointer group">
					<input
						type="checkbox"
						bind:checked={deleteConversations}
						class="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-500 focus:ring-red-500 focus:ring-offset-zinc-900"
					/>
					<span class="text-zinc-400 group-hover:text-zinc-300 transition-colors">
						Also delete <strong class="text-white">{conversationCount}</strong> linked conversation{conversationCount === 1 ? '' : 's'}
					</span>
				</label>
			{/if}

			{#if subtaskCount === 0 && conversationCount === 0}
				<p class="text-zinc-400">
					This action cannot be undone.
				</p>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex justify-end gap-3 mt-6">
			<button
				type="button"
				onclick={onCancel}
				disabled={isDeleting}
				class="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={handleConfirm}
				disabled={isDeleting}
				class="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
			>
				{#if isDeleting}
					<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Deleting...
				{:else}
					Delete
				{/if}
			</button>
		</div>
	</div>
</div>
