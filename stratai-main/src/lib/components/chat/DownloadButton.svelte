<script lang="ts">
	import { fly } from 'svelte/transition';
	import { toastStore } from '$lib/stores/toast.svelte';

	let {
		content,
		messageId,
		disabled = false
	}: {
		content: string;
		messageId: string;
		disabled?: boolean;
	} = $props();

	let isOpen = $state(false);
	let isDownloading = $state(false);
	let dropdownRef: HTMLDivElement | undefined = $state();

	const formats = [
		{ id: 'md', label: 'Markdown', ext: '.md' },
		{ id: 'docx', label: 'Word Document', ext: '.docx' },
		{ id: 'pdf', label: 'PDF', ext: '.pdf' }
	];

	async function handleDownload(format: string) {
		isDownloading = true;
		isOpen = false;

		try {
			const response = await fetch('/api/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content,
					format,
					title: `response-${messageId.slice(0, 8)}`
				})
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.error?.message || 'Export failed');
			}

			// Trigger download
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const disposition = response.headers.get('Content-Disposition');
			a.download = disposition?.match(/filename="(.+)"/)?.[1] || `response.${format}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			const formatLabel = formats.find((f) => f.id === format)?.label || format.toUpperCase();
			toastStore.success(`Downloaded as ${formatLabel}`);
		} catch (err) {
			toastStore.error(err instanceof Error ? err.message : 'Download failed');
		} finally {
			isDownloading = false;
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
			isOpen = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="relative" bind:this={dropdownRef}>
	<button
		type="button"
		onclick={() => (isOpen = !isOpen)}
		disabled={disabled || isDownloading}
		class="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600
			   text-surface-400 hover:text-white transition-all
			   disabled:opacity-50 disabled:cursor-not-allowed"
		title="Download response"
		aria-haspopup="true"
		aria-expanded={isOpen}
	>
		{#if isDownloading}
			<!-- Loading spinner -->
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
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
				></path>
			</svg>
		{:else}
			<!-- Download icon -->
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
				/>
			</svg>
		{/if}
	</button>

	{#if isOpen}
		<div class="download-dropdown" transition:fly={{ y: -5, duration: 150 }} role="menu">
			{#each formats as fmt}
				<button
					type="button"
					onclick={() => handleDownload(fmt.id)}
					class="download-dropdown-item"
					role="menuitem"
				>
					<span class="text-surface-500 font-mono text-xs">{fmt.ext}</span>
					<span>{fmt.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
