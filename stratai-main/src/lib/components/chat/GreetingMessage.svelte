<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import type { GreetingData, Task } from '$lib/types/tasks';

	interface Props {
		greeting: GreetingData;
		onFocusTask: (task: Task) => void;
		onOpenPanel: () => void;
		onDismiss: () => void;
	}

	let { greeting, onFocusTask, onOpenPanel, onDismiss }: Props = $props();

	function formatDueDate(date: Date): string {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const taskDate = new Date(date);
		taskDate.setHours(0, 0, 0, 0);

		const diff = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		if (diff < 0) return 'Overdue';
		if (diff === 0) return 'Due today';
		if (diff === 1) return 'Due tomorrow';
		if (diff < 7) return taskDate.toLocaleDateString('en-US', { weekday: 'long' });
		return taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function isOverdue(date: Date): boolean {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return date < today;
	}

	function isDueSoon(date: Date): boolean {
		const today = new Date();
		const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		return diff <= 1;
	}

	function handleButtonClick(buttonText: string) {
		if (buttonText.startsWith('Focus on')) {
			// Focus on suggested task
			if (greeting.suggestedAction) {
				onFocusTask(greeting.suggestedAction);
			}
		} else if (buttonText === 'Review all tasks') {
			onOpenPanel();
		} else {
			// Something new - just dismiss
			onDismiss();
		}
	}
</script>

<div
	class="message-container flex gap-3 py-4 group"
	in:fly={{ y: 20, duration: 300 }}
>
	<!-- AI Avatar -->
	<div class="flex-shrink-0">
		<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: var(--gradient-primary);">
			<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
					d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
			</svg>
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 min-w-0">
		<div class="flex items-center gap-2 mb-2">
			<span class="text-sm font-medium text-surface-300">StratAI</span>
			<span class="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary-500/20 text-primary-400">
				Daily Check-in
			</span>
		</div>

		<!-- Greeting Message -->
		<div class="prose prose-invert prose-sm max-w-none">
			<p class="text-surface-100 mb-4">{greeting.message}</p>
		</div>

		<!-- Task Preview (if tasks exist) -->
		{#if greeting.tasks.length > 0}
			<div class="mb-4 space-y-2">
				{#each greeting.tasks as task (task.id)}
					<button
						type="button"
						class="w-full text-left p-3 rounded-xl border border-surface-700 bg-surface-800/50
							   hover:border-surface-600 hover:bg-surface-800 transition-all group/task
							   flex items-start gap-3"
						onclick={() => onFocusTask(task)}
					>
						<!-- Color indicator -->
						<div
							class="flex-shrink-0 w-1 rounded-full self-stretch min-h-[1.5rem]"
							style="background: {task.color};"
						></div>

						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-sm text-surface-200 group-hover/task:text-surface-100 transition-colors">
									{task.title}
								</span>
								{#if task.priority === 'high'}
									<span class="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400 rounded">
										HIGH
									</span>
								{/if}
							</div>
							{#if task.dueDate}
								<div class="mt-1 text-xs
									{isOverdue(task.dueDate) ? 'text-red-400' : isDueSoon(task.dueDate) ? 'text-amber-400' : 'text-surface-500'}">
									{formatDueDate(task.dueDate)}
								</div>
							{/if}
						</div>

						<!-- Focus arrow -->
						<svg class="w-4 h-4 text-surface-500 group-hover/task:text-surface-300 transition-colors opacity-0 group-hover/task:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</button>
				{/each}
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="flex flex-wrap gap-2">
			{#each greeting.buttons as buttonText, i}
				<button
					type="button"
					class="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
						   {i === 0
							? 'text-white'
							: 'bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-200 border border-surface-700'}"
					style={i === 0 ? 'background: var(--space-accent, #3b82f6);' : ''}
					onclick={() => handleButtonClick(buttonText)}
				>
					{buttonText}
				</button>
			{/each}
		</div>

		<!-- Dismiss link -->
		<button
			type="button"
			class="mt-3 text-xs text-surface-500 hover:text-surface-400 transition-colors"
			onclick={onDismiss}
		>
			Dismiss for today
		</button>
	</div>
</div>
