<!--
	ContextSnapshotModal.svelte

	Shows the AI's available context before a new conversation starts.
	Lets users review and adjust (activate/deactivate docs/pages) before sending.

	Appears on first message in a new conversation.
	Three outcomes:
	  - "Start Chatting" → sends message with any changes made
	  - "Skip for now" → sends message unchanged
	  - Escape / backdrop click → cancels, does NOT send
-->
<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { X, Sparkles, AlertCircle } from 'lucide-svelte';
	import SnapshotNotesSection from './sections/SnapshotNotesSection.svelte';
	import SnapshotDocumentsSection from './sections/SnapshotDocumentsSection.svelte';
	import SnapshotPagesSection from './sections/SnapshotPagesSection.svelte';
	import SnapshotTasksSection from './sections/SnapshotTasksSection.svelte';

	interface DocumentItem {
		id: string;
		filename: string;
		charCount?: number;
		title?: string;
	}

	interface PageItem {
		id: string;
		title: string;
		wordCount: number;
		currentVersion?: number;
	}

	interface TaskItem {
		id: string;
		title: string;
		status: string;
		color?: string;
	}

	interface Props {
		open: boolean;
		contextName: string;
		activeDocuments: DocumentItem[];
		availableDocuments: DocumentItem[];
		activePages: PageItem[];
		availablePages: PageItem[];
		notes: { hasNotes: boolean; preview?: string };
		relatedTasks: TaskItem[];
		onstart: () => void;
		onskip: () => void;
		oncancel: () => void;
		onactivatedoc?: (docId: string) => void;
		ondeactivatedoc?: (docId: string) => void;
		onactivatepage?: (pageId: string) => void;
		ondeactivatepage?: (pageId: string) => void;
		oneditnotesclick?: () => void;
		ondismissforever?: () => void;
	}

	let {
		open,
		contextName,
		activeDocuments,
		availableDocuments,
		activePages,
		availablePages,
		notes,
		relatedTasks,
		onstart,
		onskip,
		oncancel,
		onactivatedoc,
		ondeactivatedoc,
		onactivatepage,
		ondeactivatepage,
		oneditnotesclick,
		ondismissforever
	}: Props = $props();

	// "Don't show again" checkbox state
	let dontShowAgain = $state(false);

	// Computed: do we have any docs or pages in the space?
	let hasDocs = $derived(activeDocuments.length + availableDocuments.length > 0);
	let hasPages = $derived(activePages.length + availablePages.length > 0);
	let hasTasks = $derived(relatedTasks.length > 0);
	let hasAnyContext = $derived(notes.hasNotes || hasDocs || hasPages || hasTasks);

	// Count active context items
	let activeCount = $derived(
		activeDocuments.length +
		activePages.length +
		(notes.hasNotes ? 1 : 0) +
		relatedTasks.length
	);

	function handleStart() {
		if (dontShowAgain) {
			ondismissforever?.();
		}
		onstart();
	}

	function handleSkip() {
		if (dontShowAgain) {
			ondismissforever?.();
		}
		onskip();
	}

	function handleBackdropClick(e: MouseEvent) {
		// Only close on backdrop click (not modal content)
		if (e.target === e.currentTarget) {
			oncancel();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			oncancel();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_interactive_supports_focus -->
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Context for this conversation"
		class="fixed inset-0 z-50 flex items-center justify-center p-4
		       bg-black/50 dark:bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<div
			class="w-full max-w-lg max-h-[80vh] flex flex-col
			       bg-white dark:bg-zinc-900
			       rounded-xl shadow-2xl
			       border border-zinc-200 dark:border-zinc-700/50"
			transition:fly={{ y: 20, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-700/50">
				<div class="flex items-center gap-2.5">
					<div class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20">
						<Sparkles size={16} class="text-primary-500" />
					</div>
					<div>
						<h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
							Context for this conversation
						</h3>
						<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
							{contextName}
						</p>
					</div>
				</div>
				<button
					type="button"
					class="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500
					       hover:text-zinc-600 dark:hover:text-zinc-300
					       hover:bg-zinc-100 dark:hover:bg-zinc-800
					       transition-colors"
					onclick={oncancel}
				>
					<X size={16} />
				</button>
			</div>

			<!-- Body (scrollable) -->
			<div class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
				{#if hasAnyContext}
					<!-- Active context summary -->
					<div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pb-1">
						<span>The AI will have access to <strong class="text-zinc-700 dark:text-zinc-300">{activeCount}</strong> context {activeCount === 1 ? 'source' : 'sources'}</span>
					</div>

					<!-- Notes section (always shows if area has notes feature) -->
					<SnapshotNotesSection
						hasNotes={notes.hasNotes}
						preview={notes.preview}
						oneditclick={oneditnotesclick}
					/>

					<!-- Documents section -->
					{#if hasDocs}
						<SnapshotDocumentsSection
							{activeDocuments}
							{availableDocuments}
							onactivate={onactivatedoc}
							ondeactivate={ondeactivatedoc}
						/>
					{/if}

					<!-- Pages section -->
					{#if hasPages}
						<SnapshotPagesSection
							{activePages}
							{availablePages}
							onactivate={onactivatepage}
							ondeactivate={ondeactivatepage}
						/>
					{/if}

					<!-- Tasks section -->
					{#if hasTasks}
						<SnapshotTasksSection tasks={relatedTasks} />
					{/if}
				{:else}
					<!-- Empty state -->
					<div class="flex flex-col items-center justify-center py-8 text-center">
						<div class="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3">
							<AlertCircle size={20} class="text-zinc-400 dark:text-zinc-500" />
						</div>
						<p class="text-sm font-medium text-zinc-600 dark:text-zinc-400">
							No context configured yet
						</p>
						<p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs">
							Add notes, documents, or pages to give the AI more context about your work.
						</p>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-700/50">
				<!-- Don't show again checkbox -->
				<label class="flex items-center gap-2 cursor-pointer select-none group">
					<input
						type="checkbox"
						bind:checked={dontShowAgain}
						class="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-600
						       text-primary-500 focus:ring-primary-500/20
						       bg-white dark:bg-zinc-800"
					/>
					<span class="text-[11px] text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors">
						Don't show again for this area
					</span>
				</label>

				<!-- Action buttons -->
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="px-3 py-1.5 text-xs font-medium
						       text-zinc-600 dark:text-zinc-400
						       hover:text-zinc-800 dark:hover:text-zinc-200
						       hover:bg-zinc-100 dark:hover:bg-zinc-800
						       rounded-lg transition-colors"
						onclick={handleSkip}
					>
						Skip for now
					</button>
					<button
						type="button"
						class="px-4 py-1.5 text-xs font-medium
						       text-white bg-primary-500
						       hover:bg-primary-600
						       rounded-lg transition-colors
						       shadow-sm"
						onclick={handleStart}
					>
						Start Chatting
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
