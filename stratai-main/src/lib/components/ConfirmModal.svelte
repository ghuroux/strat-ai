<script lang="ts">
	/**
	 * ConfirmModal — Generic confirmation dialog replacing native confirm()
	 *
	 * Supports danger (destructive) and primary (non-destructive) variants.
	 * Follows the same visual pattern as DeleteConfirmModal but is generic.
	 */
	import { fly, fade } from 'svelte/transition';
	import { AlertTriangle, Info } from 'lucide-svelte';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		confirmVariant?: 'danger' | 'primary';
		onConfirm: () => void;
		onCancel: () => void;
	}

	let {
		open,
		title,
		message,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		confirmVariant = 'danger',
		onConfirm,
		onCancel
	}: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') onCancel();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onCancel();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4
		       bg-black/50 dark:bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
	>
		<div
			class="w-full max-w-sm
			       bg-white dark:bg-zinc-900
			       border border-zinc-200 dark:border-zinc-700/50
			       rounded-xl shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirm-modal-title"
			transition:fly={{ y: 20, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center gap-3 p-5 border-b border-zinc-200 dark:border-zinc-700/50">
				<div
					class="w-10 h-10 rounded-lg flex items-center justify-center
					       {confirmVariant === 'danger'
						? 'bg-red-500/15 border border-red-500/30'
						: 'bg-primary-500/15 border border-primary-500/30'}"
				>
					{#if confirmVariant === 'danger'}
						<AlertTriangle class="w-5 h-5 text-red-600 dark:text-red-400" />
					{:else}
						<Info class="w-5 h-5 text-primary-600 dark:text-primary-400" />
					{/if}
				</div>
				<h2 id="confirm-modal-title" class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
					{title}
				</h2>
			</div>

			<!-- Content -->
			<div class="p-5">
				<p class="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
					{message}
				</p>
			</div>

			<!-- Actions -->
			<div
				class="flex items-center justify-end gap-3 px-5 py-4
				       border-t border-zinc-100 dark:border-zinc-700/30
				       bg-zinc-50/50 dark:bg-zinc-900/50 rounded-b-xl"
			>
				<button
					type="button"
					onclick={onCancel}
					class="px-4 py-2 rounded-lg
					       bg-zinc-100 dark:bg-zinc-800
					       hover:bg-zinc-200 dark:hover:bg-zinc-700
					       border border-zinc-300 dark:border-zinc-600
					       text-sm font-medium text-zinc-800 dark:text-zinc-200
					       transition-all duration-150"
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					onclick={onConfirm}
					class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-150
					       {confirmVariant === 'danger'
						? 'bg-red-600 hover:bg-red-700'
						: 'bg-primary-500 hover:bg-primary-600'}"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
